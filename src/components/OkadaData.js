import { supabase } from '../supabase.js'

export const OKADA_STATUS_LABELS = {
  pending: 'Booking created',
  searching_for_rider: 'Searching for rider',
  accepted: 'Rider accepted',
  arriving: 'Rider arriving',
  picked_up: 'Passenger picked up',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_rider_found: 'No rider found',
}

export function okadaStatusLabel(status) {
  const key = String(status ?? '').toLowerCase()
  return OKADA_STATUS_LABELS[key] || key || 'Booking created'
}

export function okadaStatusIcon(status) {
  const key = String(status ?? '').toLowerCase()
  const icons = {
    pending: '📝',
    searching_for_rider: '🔍',
    accepted: '✅',
    arriving: '🏍️',
    picked_up: '🧍',
    in_progress: '🛣️',
    completed: '🎯',
    cancelled: '✕',
    no_rider_found: '🚫',
  }
  return icons[key] || '📝'
}

export function okadaRideReference(rideId) {
  const id = Number(rideId)
  if (!Number.isFinite(id)) return '#OKADA-'
  return `#OKADA-${100000 + id}`
}

export async function createOkadaRide({
  passengerName,
  passengerPhone,
  pickupAddress,
  pickupArea,
  destinationAddress,
  destinationArea,
  fareEstimate,
}) {
  try {
    const { data, error } = await supabase.rpc('create_okada_ride', {
      p_passenger_name: passengerName,
      p_passenger_phone: passengerPhone,
      p_pickup_address: pickupAddress,
      p_pickup_area: pickupArea,
      p_destination_address: destinationAddress,
      p_destination_area: destinationArea,
      p_fare_estimate: Number(fareEstimate),
    })
    if (error) {
      console.error('Failed to create okada ride:', error)
      return { success: false, error: error.message }
    }
    if (!data) {
      return { success: false, error: 'Your ride could not be created. Please try again.' }
    }
    return { success: true, ride: data }
  } catch (error) {
    console.error('Error creating okada ride:', error)
    return { success: false, error: error.message || 'Failed to create okada ride.' }
  }
}

export async function claimOkadaRide(rideId) {
  if (!rideId) return { success: false, error: 'Missing ride reference.' }
  try {
    const { data, error } = await supabase.rpc('claim_okada_ride', {
      p_ride_id: rideId,
    })
    if (error) {
      console.error('Failed to claim okada ride:', error)
      return { success: false, error: error.message }
    }
    if (!data) {
      return { success: false, error: 'This ride is no longer available.' }
    }
    return { success: true, ride: data }
  } catch (error) {
    console.error('Error claiming okada ride:', error)
    return { success: false, error: error.message || 'Failed to claim okada ride.' }
  }
}

export async function updateOkadaRideStatus(rideId, newStatus, fareConfirmed = null) {
  if (!rideId) return { success: false, error: 'Missing ride reference.' }
  if (!newStatus) return { success: false, error: 'Missing status.' }
  try {
    const { data, error } = await supabase.rpc('update_okada_ride_status', {
      p_ride_id: rideId,
      p_new_status: newStatus,
      p_fare_confirmed: fareConfirmed,
    })
    if (error) {
      console.error('Failed to update okada ride:', error)
      return { success: false, error: error.message }
    }
    if (!data) {
      return { success: false, error: 'You cannot update this ride.' }
    }
    return { success: true, ride: data }
  } catch (error) {
    console.error('Error updating okada ride:', error)
    return { success: false, error: error.message || 'Failed to update okada ride.' }
  }
}

export async function cancelOkadaRide(rideId, reason = null) {
  if (!rideId) return { success: false, error: 'Missing ride reference.' }
  try {
    const { data, error } = await supabase.rpc('cancel_okada_ride', {
      p_ride_id: rideId,
      p_reason: typeof reason === 'string' ? reason.trim() : null,
    })
    if (error) {
      console.error('Failed to cancel okada ride:', error)
      return { success: false, error: error.message }
    }
    if (!data) {
      return { success: false, error: 'This ride can no longer be cancelled.' }
    }
    return { success: true, ride: data }
  } catch (error) {
    console.error('Error cancelling okada ride:', error)
    return { success: false, error: error.message || 'Failed to cancel okada ride.' }
  }
}

export async function fetchCustomerOkadaRides(customerUserId) {
  if (!customerUserId) return []
  try {
    const { data, error } = await supabase
      .from('okada_rides')
      .select('*')
      .eq('customer_user_id', customerUserId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Failed to fetch okada rides:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching okada rides:', error)
    return []
  }
}

export async function fetchAvailableOkadaRides() {
  try {
    const { data, error } = await supabase
      .from('okada_rides')
      .select('*')
      .in('status', ['pending', 'searching_for_rider'])
      .is('rider_id', null)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Failed to fetch available okada rides:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching available okada rides:', error)
    return []
  }
}

export async function fetchRiderOkadaRides(riderId) {
  const id = Number(riderId)
  if (!Number.isFinite(id) || id <= 0) return []
  try {
    const { data, error } = await supabase
      .from('okada_rides')
      .select('*')
      .eq('rider_id', id)
      .in('status', ['accepted', 'arriving', 'picked_up', 'in_progress'])
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Failed to fetch rider okada rides:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching rider okada rides:', error)
    return []
  }
}
