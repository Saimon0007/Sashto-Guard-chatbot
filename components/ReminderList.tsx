import React from 'react';
import { Reminder } from '../types';
import { t, getLocale } from '../translations';

interface ReminderListProps {
  reminders: Reminder[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string) => void;
  language?: string;
}

const ReminderList: React.FC<ReminderListProps> = ({ reminders, onToggle, onDelete, onSnooze, language = 'English' }) => {
  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50 text-bdgreen-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-bdgreen-600">{t(language, 'noReminders')}</p>
        <p className="text-xs mt-1 text-bdgreen-400">{t(language, 'askToSetReminder')}</p>
      </div>
    );
  }

  const getTypeColor = (type: Reminder['type'], completed: boolean) => {
    if (completed) return 'bg-gray-100 text-gray-400 border-gray-200';
    switch(type) {
      case 'medication': return 'bg-bdred-50 text-bdred-700 border-bdred-200';
      case 'diet': return 'bg-bdgreen-50 text-bdgreen-700 border-bdgreen-200';
      case 'appointment': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const locale = getLocale(language);
    
    if (new Date().toDateString() === date.toDateString()) {
       return `${t(language, 'todayAt')} ${date.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})}`;
    }
    return date.toLocaleString(locale, {dateStyle: 'short', timeStyle: 'short'});
  };

  return (
    <div className="space-y-3 p-4">
      {reminders.map((reminder) => (
        <div 
          key={reminder.id} 
          className={`group flex items-center p-3 rounded-xl border shadow-sm transition-all duration-300
            ${reminder.completed 
              ? 'bg-gray-50/80 border-gray-100' 
              : reminder.snoozed 
                ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300 hover:shadow-md'
                : 'bg-white border-bdgreen-100 hover:border-bdgreen-300 hover:shadow-md'
            }`}
        >
          <button 
            onClick={() => onToggle(reminder.id)}
            className={`flex-shrink-0 w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-300
              ${reminder.completed 
                ? 'bg-bdgreen-500 border-bdgreen-500 text-white shadow-sm' 
                : 'border-bdgreen-200 hover:border-bdgreen-400 bg-white text-transparent hover:text-bdgreen-200'
              }`}
            aria-label={reminder.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${reminder.completed ? 'scale-100' : 'scale-0'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 pr-2 overflow-hidden">
                <h4 className={`font-medium truncate transition-colors duration-300 ${reminder.completed ? 'line-through text-gray-400' : 'text-bdgreen-900'}`}>
                  {reminder.title}
                </h4>
                {reminder.snoozed && !reminder.completed && (
                  <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                     {t(language, 'snoozed')}
                  </span>
                )}
              </div>
              <span className={`flex-shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border transition-colors duration-300 ${getTypeColor(reminder.type, reminder.completed)}`}>
                {reminder.type}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 mt-1 text-xs transition-colors duration-300 ${reminder.completed ? 'text-gray-300' : 'text-gray-500'}`}>
               {!reminder.completed && (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${reminder.snoozed ? 'text-yellow-500' : 'text-bdgreen-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
               )}
               <p className={`${reminder.snoozed && !reminder.completed ? 'text-yellow-700 font-medium' : ''}`}>
                  {formatTime(reminder.time)}
               </p>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            {!reminder.completed && (
              <button
                onClick={() => onSnooze(reminder.id)}
                className="p-2 rounded-full text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Snooze for 15 minutes"
                title={t(language, 'snooze')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            <button 
              onClick={() => onDelete(reminder.id)}
              className={`p-2 rounded-full transition-colors duration-200
                ${reminder.completed 
                    ? 'text-gray-300 hover:text-bdred-400 hover:bg-bdred-50' 
                    : 'text-gray-400 hover:text-bdred-500 hover:bg-bdred-50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                }`}
              aria-label={t(language, 'delete')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReminderList;