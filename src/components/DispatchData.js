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
    delivered: '🎯',
    cancelled: '✕',
  }
  return icons[key] || '📝'
}

export function isDispatchCancellable(status, riderId) {
  // Only cancellable before a rider has accepted, and only if no rider assigned
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
 */
export async function updateDispatchBookingStatus(bookingId, newStatus) {
  if (!bookingId) return { success: false, error: 'Missing booking reference.' }
  if (!newStatus) return { success: false, error: 'Missing status.' }

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
 * Fetch available dispatch bookings for riders (pending/searching, no rider assigned).
 */
export async function fetchAvailableDispatchBookings() {
  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .select('*')
      .in('status', ['pending', 'searching_for_rider'])
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
 */
export async function fetchRiderDispatchBookings() {
  try {
    const { data, error } = await supabase
      .from('dispatch_bookings')
      .select('*')
      .not('rider_id', 'is', null)
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

function claimDispatchErrorMessage(message) {
  const text = String(message || '')
  if (text.includes('not an active Ewizzy rider')) {
    return 'Your rider account is not active. Please contact Ewizzy support.'
  }
  if (text.includes('Go online before accepting')) {
    return 'Go online before accepting a dispatch.'
  }
  if (text.includes('order_id is required') || text.includes('booking_id is required')) {
    return 'This booking could not be identified.'
  }
  if (text.includes('claim_dispatch_booking') || text.includes('404')) {
    return 'Claiming a dispatch is not available yet. Please contact Ewizzy support.'
  }
  return text || 'This booking could not be claimed.'
}
