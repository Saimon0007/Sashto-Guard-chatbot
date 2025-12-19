import React, { useState } from 'react';
import { HealthRecord, ConsentSettings, AuditLogEntry } from '../types';
import { t } from '../translations';

interface HealthVaultProps {
  records: HealthRecord[];
  consent: ConsentSettings;
  auditLogs: AuditLogEntry[];
  onImport: () => void;
  onUpdateConsent: (newConsent: ConsentSettings) => void;
  onExport: () => void;
  language?: string;
}

const HealthVault: React.FC<HealthVaultProps> = ({ 
  records, 
  consent, 
  auditLogs, 
  onImport, 
  onUpdateConsent,
  onExport,
  language = 'English'
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'import' | 'privacy'>('timeline');

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'medication': return 'bg-bdred-100 text-bdred-800 border-bdred-200';
      case 'condition': return 'bg-bdgreen-100 text-bdgreen-800 border-bdgreen-200';
      case 'lab': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="p-6 border-b bg-white">
        <h2 className="text-2xl font-bold text-bdgreen-900">{t(language, 'vault')}</h2>
        <p className="text-bdgreen-600 text-sm">Secure, patient-owned medical records and privacy controls.</p>
        
        <div className="flex space-x-1 mt-6 bg-bdgreen-50/50 p-1 rounded-xl w-fit border border-bdgreen-100">
          {['timeline', 'import', 'privacy'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-white text-bdgreen-800 shadow-sm border border-bdgreen-100' 
                  : 'text-bdgreen-600 hover:text-bdgreen-800 hover:bg-bdgreen-100/50'
              }`}
            >
              {t(language, tab as any)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'timeline' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-bdgreen-900">{t(language, 'timeline')}</h3>
               <button 
                  onClick={onExport}
                  className="flex items-center text-sm text-bdgreen-700 hover:text-bdgreen-900 hover:underline"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
               </button>
            </div>
            
            {records.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-bdgreen-200">
                <p className="text-bdgreen-500">{t(language, 'noRecords')}</p>
                <button onClick={() => setActiveTab('import')} className="mt-2 text-bdred-500 font-medium hover:underline">{t(language, 'importData')}</button>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-bdgreen-50 hover:border-bdgreen-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase border ${getCategoryColor(record.category)}`}>
                            {record.category}
                         </span>
                         <div>
                            <h4 className="font-semibold text-gray-900">{record.title}</h4>
                            <p className="text-xs text-gray-500">
                               Source: <span className="font-medium text-bdgreen-700">{record.source}</span>
                               {record.isVerified && <span className="ml-1 text-bdgreen-500">✓ Verified</span>}
                            </p>
                         </div>
                      </div>
                      <span className="text-sm text-gray-400 font-mono">{record.date}</span>
                    </div>
                    {record.value && (
                       <div className="mt-3 ml-1 pl-3 border-l-2 border-bdgreen-100">
                          <p className="text-sm font-medium text-gray-700">{record.value}</p>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-bdgreen-100">
              <h3 className="text-lg font-bold text-bdgreen-900 mb-2">{t(language, 'connectProvider')}</h3>
              <p className="text-sm text-gray-600 mb-6">Connect your hospital EHR or wearable device securely via FHIR standards.</p>
              
              <div className="grid gap-4">
                 <button onClick={onImport} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-bdgreen-400 hover:bg-bdgreen-50 transition-all group">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                          🏥
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-gray-800">{t(language, 'hospitalSystem')}</p>
                          <p className="text-xs text-gray-500">Includes Labs, Meds, Conditions</p>
                       </div>
                    </div>
                    <span className="text-bdgreen-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">Connect →</span>
                 </button>

                 <button onClick={onImport} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-bdgreen-400 hover:bg-bdgreen-50 transition-all group">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                          ⌚
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-gray-800">{t(language, 'connectWearable')}</p>
                          <p className="text-xs text-gray-500">Heart rate, Activity, Sleep</p>
                       </div>
                    </div>
                    <span className="text-bdgreen-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">Connect →</span>
                 </button>
              </div>
            </div>
            <div className="text-center text-xs text-gray-400">
               Secured by AES-256 Encryption & FHIR R4 Standard
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Consent Engine */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-bdgreen-100 h-fit">
               <h3 className="text-lg font-bold text-bdgreen-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-bdred-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {t(language, 'consentEngine')}
               </h3>
               <p className="text-sm text-gray-500 mb-6">Control exactly what the AI Assistant can access.</p>
               
               <div className="space-y-4">
                  {[
                    { key: 'shareDemographics', label: t(language, 'shareDemographics') },
                    { key: 'shareMedications', label: t(language, 'shareMedications') },
                    { key: 'shareConditions', label: t(language, 'shareConditions') },
                    { key: 'shareLabs', label: t(language, 'shareLabs') },
                    { key: 'shareWithResearch', label: t(language, 'shareResearch') },
                  ].map((item) => (
                     <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                           <p className="font-medium text-gray-800">{item.label}</p>
                        </div>
                        <button 
                           onClick={() => onUpdateConsent({ ...consent, [item.key]: !consent[item.key as keyof ConsentSettings] })}
                           className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${consent[item.key as keyof ConsentSettings] ? 'bg-bdgreen-500' : 'bg-gray-200'}`}
                        >
                           <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${consent[item.key as keyof ConsentSettings] ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                     </div>
                  ))}
               </div>
            </div>

            {/* Audit Log */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-bdgreen-100 flex flex-col h-[500px]">
               <h3 className="text-lg font-bold text-bdgreen-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t(language, 'auditLog')}
               </h3>
               <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                  {auditLogs.length === 0 ? (
                     <p className="text-sm text-gray-400 italic">No activity recorded yet.</p>
                  ) : (
                     auditLogs.slice().reverse().map((log) => (
                        <div key={log.id} className="text-xs border-l-2 border-gray-200 pl-3 py-1">
                           <div className="flex justify-between text-gray-400 mb-0.5">
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                              <span className="font-mono">{log.actor}</span>
                           </div>
                           <p className="text-gray-800 font-medium">
                              <span className={`font-bold ${log.action === 'ACCESS_DENIED' ? 'text-bdred-500' : 'text-bdgreen-600'}`}>{log.action}</span>: {log.details}
                           </p>
                        </div>
                     ))
                  )}
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default HealthVault;