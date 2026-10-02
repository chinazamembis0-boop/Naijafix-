import { useState } from 'react'
import { supabase, uploadPrivateFile } from '../supabase.js'

export const RIDER_VEHICLE_LABEL = 'Motorcycle / Okada'
export const RIDER_ID_BUCKET = 'rider-verification-documents'
export const RIDER_PHOTO_BUCKET = 'profile-photos'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const emptyForm = {
  fullName: '',
  phone: '',
  operatingArea: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
}

function validateImage(file) {
  if (!file) return 'Please choose a photo.'
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Use a JPG, PNG or WEBP photo.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'That photo is too large. Use a photo under 5MB.'
  }
  return ''
}

/**
 * The Ewizzy Okada rider registration form.
 *
 * Deliberately short: name, phone, photo, motorcycle/Okada (fixed),
 * operating area, emergency contact and one ID card. There is no vehicle
 * choice to get wrong and no second document to find, because a rider
 * should be able to finish this on a phone with one hand.
 *
 * All writes go through submit_rider_verification(), which is what
 * actually decides the vehicle type and the verification status.
 */
function RiderRegistration({ user, defaultName = '', defaultPhone = '', onRegistered }) {
  const [form, setForm] = useState({
    ...emptyForm,
    fullName: defaultName,
    phone: defaultPhone,
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [idCard, setIdCard] = useState(null)
  const [idPreview, setIdPreview] = useState('')
  const [step, setStep] = useState('')
  const [error, setError] = useState('')

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const problem = validateImage(file)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleIdCard = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const problem = validateImage(file)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    if (idPreview) URL.revokeObjectURL(idPreview)
    setIdCard(file)
    setIdPreview(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoPreview('')
  }

  const clearIdCard = () => {
    if (idPreview) URL.revokeObjectURL(idPreview)
    setIdCard(null)
    setIdPreview('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!user?.user_id) {
      setError('Please log in before registering as a rider.')
      return
    }

    if (!form.fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (!form.phone.trim()) {
      setError('Please enter your phone number.')
      return
    }

    if (!form.operatingArea.trim()) {
      setError('Please enter the area you deliver in.')
      return
    }

    if (!form.emergencyContactName.trim() || !form.emergencyContactPhone.trim()) {
      setError('Please enter an emergency contact name and phone number.')
      return
    }

    if (!photo) {
      setError('Please add your profile photo.')
      return
    }

    if (!idCard) {
      setError('Please add a photo of your ID card.')
      return
    }

    setStep('Uploading your photo...')

    let photoPath
    let idPath

    try {
      photoPath = await uploadPrivateFile(RIDER_PHOTO_BUCKET, user.user_id, photo)

      setStep('Uploading your ID card...')
      idPath = await uploadPrivateFile(RIDER_ID_BUCKET, user.user_id, idCard)

      setStep('Sending your details...')

      const { data, error: submitError } = await supabase.rpc('submit_rider_verification', {
        p_full_name: form.fullName.trim(),
        p_phone: form.phone.trim(),
        p_photo_path: photoPath,
        p_operating_area: form.operatingArea.trim(),
        p_emergency_contact_name: form.emergencyContactName.trim(),
        p_emergency_contact_phone: form.emergencyContactPhone.trim(),
        p_id_document_path: idPath,
      })

      if (submitError) throw submitError

      if (onRegistered) onRegistered(data)
    } catch (err) {
      console.error('Rider registration failed:', err)
      setError(
        'We could not save your registration: ' +
          (err?.message || 'Please check your connection and try again.')
      )
      setStep('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="rider-name">Full name *</label>
      <input
        id="rider-name"
        type="text"
        placeholder="Your full name"
        value={form.fullName}
        onChange={(event) => updateForm('fullName', event.target.value)}
        required
      />

      <label htmlFor="rider-phone">Phone number *</label>
      <input
        id="rider-phone"
        type="tel"
        placeholder="08012345678"
        value={form.phone}
        onChange={(event) => updateForm('phone', event.target.value)}
        required
      />

      <label>Profile photo *</label>
      <label className="rider-upload">
        <span className="rider-upload-btn">📷 Take or choose photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhoto} />
      </label>
      {photoPreview && (
        <div className="rider-upload-preview">
          <img src={photoPreview} alt="Profile photo preview" />
          <button type="button" className="secondary-button" onClick={clearPhoto}>
            Change photo
          </button>
        </div>
      )}

      <label htmlFor="rider-vehicle">Vehicle</label>
      <div className="rider-vehicle">
        <input
          id="rider-vehicle"
          type="text"
          value={`🏍️ ${RIDER_VEHICLE_LABEL}`}
          readOnly
          aria-readonly="true"
        />
        <p className="rider-hint">Ewizzy riders deliver on a motorcycle (Okada).</p>
      </div>

      <label htmlFor="rider-area">Area you deliver in *</label>
      <input
        id="rider-area"
        type="text"
        placeholder="e.g. Lagos"
        value={form.operatingArea}
        onChange={(event) => updateForm('operatingArea', event.target.value)}
        required
      />

      <label htmlFor="rider-emergency-name">Emergency contact name *</label>
      <input
        id="rider-emergency-name"
        type="text"
        placeholder="Name of the person to call"
        value={form.emergencyContactName}
        onChange={(event) => updateForm('emergencyContactName', event.target.value)}
        required
      />

      <label htmlFor="rider-emergency-phone">Emergency contact phone *</label>
      <input
        id="rider-emergency-phone"
        type="tel"
        placeholder="08012345678"
        value={form.emergencyContactPhone}
        onChange={(event) => updateForm('emergencyContactPhone', event.target.value)}
        required
      />

      <div className="rider-id-section">
        <h3>🆔 ID Card — For Verification</h3>
        <p>Upload a clear photo of your ID card. This is used only for Ewizzy verification.</p>

        <label className="rider-upload">
          <span className="rider-upload-btn">🆔 Upload ID card</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleIdCard} />
        </label>

        {idPreview && (
          <div className="rider-upload-preview">
            <img src={idPreview} alt="ID card preview" />
            <button type="button" className="secondary-button" onClick={clearIdCard}>
              Replace ID card
            </button>
          </div>
        )}

        <p className="rider-hint">Only Ewizzy admins can see your ID card. Nobody else.</p>
      </div>

      {error && <p className="rider-error">{error}</p>}

      {step && <p className="rider-status">{step}</p>}

      <button type="submit" className="primary-full rider-submit" disabled={Boolean(step)}>
        {step ? 'Please wait...' : 'Submit registration'}
      </button>
    </form>
  )
}

export default RiderRegistration
