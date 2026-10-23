import { supabase } from '../supabase.js'

/**
 * Ewizzy Direct Dispatch data layer.
 *
 * Dispatch bookings are parcel delivery requests from customers to
 * motorcycle/Okada riders. They are completely separate from food orders.
 *
 * No payment gateway is integrated: fare_estimate is shown as an estimate
 * only, and nothing here pretends a payment has been collected or verified.
 */

export const DISPATCH_STATUS_SEQUENCE = [
  { status: 'pending', label: 'Booking created', short: 'Created' },
  { status: 'searching_for_rider', label: 'Searching for rider', short: 'Finding rider' },
  { status: 'accepted', label: 'Rider accepted', short: 'Accepted' },
  { status: 'picked_up', label: 'Parcel picked up', short: 'Picked up' },
  { status: 'in_transit', label: 'On the way', short: 'In transit' },
  { status: 'delivered', label: 'Delivered', short: 'Delivered' },
  { status: 'released', label: 'Released by rider', short: 'Released' },
  { status: 'cancelled', label: 'Cancelled', short: 'Cancelled' },
]

const DISPATCH_STATUS_LABELS = Object.fromEntries(
  DISPATCH_STATUS_SEQUENCE.map((s) => [s.status, s.label])
)

export function dispatchStatusLabel(status) {
  const key = String(status ?? '').toLowerCase()
  return DISPATCH_STATUS_LABELS[key] || key || 'Created'
}

export function dispatchStatusIcon(status) {
  const key = String(status ?? '').toLowerCase()
  const icons = {
    pending: '📝',
    searching_for_rider: '🔍',
    accepted: '✅',
    picked_up: '📦',
    in_transit: '🏍️',
    released: '🔄',
    delivered: '🎯',
    cancelled: '✕',
  }
  return icons[key] || '📝'
}

export function isDispatchCancellable(status, riderId) {
  // Only cancellable before a rider has accepted, and only if no rider assigned.
  // A 'released' booking has no rider assigned but is already past the
  // cancellable window -- it can only be re-claimed, not cancelled.
  if (!status) return false
  if (riderId) return false
  return ['pending', 'searching_for_rider'].includes(String(status).toLowerCase())
}

export function dispatchBookingReference(bookingId) {
  const id = Number(bookingId)
  if (!Number.isFinite(id)) return '#DISP-'
  return `#DISP-${100000 + id}`
}

/**
 * Create a new dispatch booking via the insert policy.
 * All pricing fields are intentionally not supplied by the client:
 * fare_estimate is set by the customer-facing estimate (not enforced server-side)
 * and is advisory only.
 */
export async function createDispatchBooking({
  customerUserId,
  restaurantId = null,
  foodOrderId = null,
  pickupContactName,
  pickupContactPhone,
  pickupAddress,
  pickupArea,
  recipientName,
  recipientPhone,
  dropoffAddress,
  dropoffArea,
  itemDescription,
  packageDetails,
  additionalInstructions,
  fareEstimate = null,
}) {
  if (!customerUserId) {
    return { success: false, error: 'You must be signed in to book a dispatch.' }
  }

  const required = [
    { label: 'Pickup contact name', value: pickupContactName },
    { label: 'Pickup contact phone', value: pickupContactPhone },
    { label: 'Pickup address', value: pickupAddress },
    { label: 'Pickup area', value: pickupArea },
    { label: 'Recipient name', value: recipientName },
    { label: 'Recipient phone', value: recipientPhone },
    { label: 'Drop-off address', value: dropoffAddress },
    { label: 'Drop-off area', value: dropoffArea },
    { label: 'Item description', value: itemDescription },
  ]

  for (const field of required) {
    if (!field.value || !String(field.value).trim()) {
      return { success: false, error: `${field.label} is required.` }
    }
  }

  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .insert({
        customer_user_id: customerUserId,
        restaurant_id: restaurantId ? Number(restaurantId) : null,
        food_order_id: foodOrderId ? Number(foodOrderId) : null,
        pickup_contact_name: pickupContactName.trim(),
        pickup_contact_phone: pickupContactPhone.trim(),
        pickup_address: pickupAddress.trim(),
        pickup_area: pickupArea.trim(),
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        dropoff_address: dropoffAddress.trim(),
        dropoff_area: dropoffArea.trim(),
        item_description: itemDescription.trim(),
        package_details: packageDetails ? packageDetails.trim() : null,
        additional_instructions: additionalInstructions ? additionalInstructions.trim() : null,
        fare_estimate: fareEstimate ? Number(fareEstimate) : null,
        status: 'pending',
      })
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Failed to create dispatch booking:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Your booking could not be created. Please try again.' }
    }

    return { success: true, booking: data }
  } catch (error) {
    console.error('Error creating dispatch booking:', error)
    return { success: false, error: error.message || 'Failed to create dispatch booking.' }
  }
}

/**
 * Fetch all dispatch bookings for a customer.
 */
export async function fetchCustomerDispatchBookings(customerUserId) {
  if (!customerUserId) return []
  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .select('*')
      .eq('customer_user_id', customerUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch dispatch bookings:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching dispatch bookings:', error)
    return []
  }
}

/**
 * Fetch a single dispatch booking by ID (customer-owned only).
 */
export async function fetchDispatchBooking(bookingId, customerUserId) {
  if (!bookingId) return null
  try {
    let query = supabase.from('dispatch_bookings').select('*').eq('id', bookingId)
    if (customerUserId) query = query.eq('customer_user_id', customerUserId)
    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Failed to fetch dispatch booking:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error fetching dispatch booking:', error)
    return null
  }
}

/**
 * Cancel a dispatch booking (customer-owned, before acceptance).
 */
export async function cancelDispatchBooking(bookingId, customerUserId, reason = null) {
  if (!bookingId) return { success: false, error: 'Missing booking reference.' }
  if (!customerUserId) return { success: false, error: 'You must be signed in to cancel a booking.' }

  const update = { status: 'cancelled' }
  if (typeof reason === 'string' && reason.trim()) {
    update.cancel_reason = reason.trim()
  }

  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .update(update)
      .eq('id', bookingId)
      .eq('customer_user_id', customerUserId)
      .in('status', ['pending', 'searching_for_rider'])
      .is('rider_id', null)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Failed to cancel dispatch booking:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: false,
        error: 'This booking can no longer be cancelled because a rider has already accepted it.',
      }
    }

    return { success: true, booking: data }
  } catch (error) {
    console.error('Error cancelling dispatch booking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Rider cancel / release a dispatch booking they already own.
 *
 * A rider may only cancel a booking that is assigned to them, and only at
 * a stage the database transition rules permit. The dispatch_bookings
 * transition predicate allows cancellation only from 'pending' and
 * 'searching_for_rider' — both of which are unassigned — so a rider who
 * has already claimed a booking (status 'accepted' or later) cannot cancel
 * it through this path. That is intentional: once a rider has accepted,
 * the parcel is in their hands and the release must go through an
 * explicit, authorized server-side transition.
 *
 * This function therefore:
 *   - rejects the call entirely if the booking is not currently assigned
 *     to the rider (the .eq('rider_id', riderId) filter plus the
 *     guard trigger both enforce this);
 *   - rejects the call if the status is not cancellable under the
 *     transition rules;
 *   - never touches rider_id, addresses, price or audit fields.
 *
 * A rider cancelling their own accepted booking requires a database
 * change (see the prepared migration 20261016000004) and is NOT applied
 * to the live database without explicit approval.
 */
export async function cancelRiderDispatchBooking(bookingId, riderId, reason = null) {
  if (!bookingId) return { success: false, error: 'Missing booking reference.' }
  if (!riderId) return { success: false, error: 'You must be signed in as a rider to cancel a dispatch.' }

  const update = { status: 'cancelled' }
  if (typeof reason === 'string' && reason.trim()) {
    update.cancel_reason = reason.trim()
  }

  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .update(update)
      .eq('id', bookingId)
      .eq('rider_id', riderId)
      .in('status', ['pending', 'searching_for_rider'])
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Failed to cancel rider dispatch booking:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: false,
        error:
          'This booking can no longer be cancelled. It may have already been picked up or delivered.',
      }
    }

    return { success: true, booking: data }
  } catch (error) {
    console.error('Error cancelling rider dispatch booking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Release an accepted dispatch booking back to the pool (rider-only).
 *
 * Delegates to the release_dispatch_booking(bigint, text) SECURITY DEFINER
 * RPC, which enforces: the caller is the verified rider currently assigned
 * to the booking, the booking is in 'accepted' stage, and the release
 * atomically clears rider_id and sets status='released'. A customer or
 * another rider cannot call it, and it never touches protected fields.
 */
export async function releaseDispatchBooking(bookingId, riderId, reason = null) {
  if (!bookingId) return { success: false, error: 'Missing booking reference.' }
  if (!riderId) return { success: false, error: 'You must be signed in as a rider to release a dispatch.' }

  try {
    const { data, error } = await supabase.rpc('release_dispatch_booking', {
      p_booking_id: bookingId,
      p_reason: typeof reason === 'string' ? reason.trim() : null,
    })

    if (error) {
      console.error('Failed to release dispatch booking:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: false,
        error:
          'This dispatch booking cannot be released. It may belong to another rider or have already advanced.',
      }
    }

    return { success: true, booking: data }
  } catch (error) {
    console.error('Error releasing dispatch booking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Claim an available dispatch booking (rider-only).
 * Uses the claim_dispatch_booking RPC for atomic claiming.
 */
export async function claimDispatchBooking(bookingId) {
  if (!bookingId) return { success: false, error: 'Missing booking reference.' }

  try {
    const { data, error } = await supabase.rpc('claim_dispatch_booking', {
      p_booking_id: bookingId,
    })

    if (error) {
      console.error('Failed to claim dispatch booking:', error)
      return { success: false, error: claimDispatchErrorMessage(error.message) }
    }

    if (!data) {
      return { success: false, error: 'This dispatch booking is no longer available.' }
    }

    return { success: true, booking: data }
  } catch (error) {
    console.error('Error claiming dispatch booking:', error)
    return { success: false, error: error.message || 'Failed to claim dispatch booking.' }
  }
}

/**
 * Update dispatch booking status (rider fulfilment transitions).
 *
 * The 'accepted' transition is special: assigning a rider is only
 * authorized through the claim_dispatch_booking() RPC. A direct UPDATE
 * that sets status='accepted' hits the dispatch_bookings_guard_update
 * trigger, which rejects any rider_id change that did not come from the
 * claim function — the trigger raises
 *   "Customers may only cancel a dispatch booking; no other fields may
 *    change"
 * because the client-supplied payload carries rider_id on a row that
 * already had one, or because the guard sees a rider_id change it does
 * not recognize as a claim.
 *
 * So the accept step is delegated to the atomic claim RPC, while later
 * stages (picked_up / in_transit / delivered) remain a direct status
 * update that the guard permits for the assigned rider only.
 */
export async function updateDispatchBookingStatus(bookingId, newStatus) {
  if (!bookingId) return { success: false, error: 'Missing booking reference.' }
  if (!newStatus) return { success: false, error: 'Missing status.' }

  // Accepting == claiming. The RPC enforces: verified rider, online,
  // unclaimed, pending/searching. Exactly one concurrent caller wins.
  if (newStatus === 'accepted') {
    return claimDispatchBooking(bookingId)
  }

  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Failed to update dispatch booking:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'You cannot update this booking.' }
    }

    return { success: true, booking: data }
  } catch (error) {
    console.error('Error updating dispatch booking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fetch available dispatch bookings for riders.
 *
 * Eligible statuses are the unassigned ones a rider may claim: pending,
 * searching_for_rider, and released (a booking a rider released back to the
 * pool after accepting). A rider_id IS NULL guard keeps assigned bookings
 * out of this list, so a booking currently owned by another rider can never
 * appear here.
 */
export async function fetchAvailableDispatchBookings() {
  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .select('*')
      .in('status', ['pending', 'searching_for_rider', 'released'])
      .is('rider_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch available dispatch bookings:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching available dispatch bookings:', error)
    return []
  }
}

/**
 * Fetch dispatch bookings assigned to the current rider.
 *
 * Scoped to the intended rider and to live statuses, consistent with the
 * "Riders can view their own dispatch bookings" RLS policy and the
 * dashboard behaviour. The rider id is supplied explicitly and coerced to
 * a Number so a bigint/string mismatch in the client cannot silently
 * return the wrong rider's bookings. RLS remains the authoritative
 * access-control layer; this is query scoping only.
 */
export async function fetchRiderDispatchBookings(riderId) {
  const id = Number(riderId)
  if (!Number.isFinite(id) || id <= 0) {
    return []
  }
  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .select('*')
      .eq('rider_id', id)
      .in('status', ['accepted', 'picked_up', 'in_transit'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch rider dispatch bookings:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching rider dispatch bookings:', error)
    return []
  }
}

/**
 * Fetch dispatch bookings created by a restaurant owner.
 *
 * Scoped to the restaurant the caller owns, so a restaurant can see only
 * its own delivery requests. RLS remains the authoritative access layer;
 * this is query scoping only.
 */
export async function fetchRestaurantDispatchBookings(restaurantId) {
  const id = Number(restaurantId)
  if (!Number.isFinite(id) || id <= 0) {
    return []
  }
  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .select('*')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch restaurant dispatch bookings:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching restaurant dispatch bookings:', error)
    return []
  }
}

/**
 * Classify a claim_dispatch_booking() failure so the UI can react
 * appropriately. Three categories matter:
 *
 *   - NOT_AVAILABLE: the booking was taken by another rider (P0001). The
 *     row should be removed from the list and the rider shown a friendly
 *     message.
 *   - NOT_CONFIGURED: the RPC itself is missing or misconfigured (404,
 *     "function does not exist"). This is an operator problem, not a
 *     transient failure, and the rider should be told to contact support.
 *   - TRANSIENT: network errors, permission denials (42501), server
 *     errors (5xx). The booking may still be claimable, so it must stay
 *     in the list and the rider should be invited to retry.
 */
function claimDispatchErrorMessage(message) {
  const text = String(message || '').toLowerCase()

  if (text.includes('not an active Ewizzy rider') || text.includes('not a verified Ewizzy rider')) {
    return 'Your rider account is not active. Please contact Ewizzy support.'
  }
  if (text.includes('go online before accepting')) {
    return 'Go online before accepting a dispatch.'
  }
  if (text.includes('booking_id is required') || text.includes('order_id is required')) {
    return 'This booking could not be identified.'
  }

  // Claim conflict: taken by another rider, or already claimed/advanced.
  if (
    text.includes('no longer available') ||
    text.includes('just taken by another rider') ||
    text.includes('p0001') ||
    text.includes('already')
  ) {
    return 'This dispatch booking is no longer available. It was just taken by another rider.'
  }

  // RPC missing or misconfigured — distinct from a transient failure.
  if (
    text.includes('404') ||
    text.includes('does not exist') ||
    text.includes('function public.claim_dispatch_booking') ||
    text.includes('function public.claim_dispatch_booking(bigint)')
  ) {
    return 'Claiming a dispatch is not available yet. Please contact Ewizzy support.'
  }

  // Anything else is treated as transient: network, 42501, 5xx, etc.
  return text || 'This booking could not be claimed. Please try again.'
}

/**
 * Returns true when the error message indicates the booking is no longer
 * claimable and may safely be removed from the rider's list.
 */
export function claimDispatchUnavailableError(message) {
  const text = String(message || '').toLowerCase()
  return (
    text.includes('no longer available') ||
    text.includes('just taken by another rider') ||
    text.includes('p0001') ||
    text.includes('already')
  )
}
