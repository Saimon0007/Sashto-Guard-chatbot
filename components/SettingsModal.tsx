import React, { useState } from 'react';
import { UserProfile } from '../types';
import { t } from '../translations';

interface SettingsModalProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onSave, onClose }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);

  // Use the language selected IN THE FORM to translate the form itself instantly
  const lang = formData.language || 'English';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className={`fixed inset-0 bg-bdgreen-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${lang === 'Arabic' ? 'rtl' : 'ltr'}`} dir={lang === 'Arabic' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-bdgreen-100">
        <div className="bg-gradient-to-r from-bdgreen-700 to-bdgreen-800 p-5 text-white flex justify-between items-center shadow-md">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-bdred-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t(lang, 'profile')}
          </h2>
          <button onClick={onClose} className="hover:bg-bdgreen-600 p-1 rounded-full transition-colors text-bdgreen-100 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'age')}</label>
              <input
                type="text"
                name="age"
                value={formData.age || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'languagePref')}</label>
             <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Chinese">Chinese (中文)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Arabic">Arabic (العربية)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'location')}</label>
             <input
                type="text"
                name="location.city" 
                value={formData.location.city || ''}
                onChange={(e) => setFormData({...formData, location: {...formData.location, city: e.target.value}})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
                placeholder={formData.location.lat ? `GPS: ${formData.location.lat.toFixed(2)}, ${formData.location.lng.toFixed(2)}` : ''}
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'conditions')}</label>
            <textarea
              name="conditions"
              value={formData.conditions || ''}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'diet')}</label>
            <textarea
              name="dietaryRestrictions"
              value={formData.dietaryRestrictions || ''}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none resize-none"
            />
          </div>

          <div className="border-t border-gray-200 pt-4 mt-2">
            <h3 className="text-sm font-bold text-bdgreen-900 mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-bdred-500 mr-2"></span>
              {t(lang, 'medications')}
            </h3>
            <div className="space-y-3 bg-bdgreen-50 p-4 rounded-xl border border-bdgreen-100">
              <div>
                <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'medName')}</label>
                <input
                  type="text"
                  name="medicationName"
                  value={formData.medicationName || ''}
                  onChange={handleChange}
                  className="w-full border border-bdgreen-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'dosage')}</label>
                  <input
                    type="text"
                    name="dosage"
                    value={formData.dosage || ''}
                    onChange={handleChange}
                    className="w-full border border-bdgreen-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'frequency')}</label>
                  <input
                    type="text"
                    name="frequency"
                    value={formData.frequency || ''}
                    onChange={handleChange}
                    className="w-full border border-bdgreen-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bdgreen-800 mb-1">{t(lang, 'instructions')}</label>
                <textarea
                  name="medicationInstructions"
                  value={formData.medicationInstructions || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-bdgreen-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-bdgreen-500 focus:border-bdgreen-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-bdred-500 to-bdred-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-bdred-600 hover:to-bdred-700 transition-all shadow-md active:transform active:scale-95"
            >
              {t(lang, 'saveProfile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;