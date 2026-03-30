import React from 'react';

const AdminProfileModal = ({
  onClose,
  profile,
  profileForm,
  setProfileForm,
  profileError,
  profileSaving,
  onSubmit,
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary
}) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">My Profile</h2>
      {profileError && <p className="text-sm text-red-600 mb-3">{profileError}</p>}
      {!profile ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>First Name</label>
            <input type="text" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input type="text" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Profile Picture URL</label>
            <input type="text" value={profileForm.profilePicture} onChange={e => setProfileForm({ ...profileForm, profilePicture: e.target.value })} className={inputClass} placeholder="https://..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={profileSaving} className={btnPrimary}>{profileSaving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  </div>
);

export default AdminProfileModal;
