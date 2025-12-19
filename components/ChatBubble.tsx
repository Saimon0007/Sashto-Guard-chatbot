import React from 'react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { t } from '../translations';

interface ChatBubbleProps {
  message: Message;
  language?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, language = 'English' }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex flex-col w-full mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <div 
        className={`
          max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm text-sm md:text-base leading-relaxed transition-all duration-300
          ${isUser 
            ? 'bg-gradient-to-br from-bdgreen-600 to-bdgreen-800 text-white rounded-tr-none shadow-md shadow-bdgreen-600/10' 
            : 'bg-white text-gray-800 border border-bdgreen-100 rounded-tl-none'
          }
          ${message.isError ? 'border-bdred-500 bg-red-50 text-red-900' : ''}
        `}
      >
        {/* Render Attachment if present */}
        {message.attachment && (
          <div className="mb-3 rounded-lg overflow-hidden border border-white/20 bg-black/5">
             {message.attachment.type === 'image' && (
                <img 
                  src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                  alt="Attachment" 
                  className="max-w-full h-auto max-h-60 object-contain mx-auto"
                />
             )}
             {message.attachment.mimeType === 'application/pdf' && (
                <div className="p-4 flex items-center gap-3 bg-white/10">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-bdred-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                   </svg>
                   <span className="font-medium text-sm truncate max-w-[150px]">{message.attachment.name || 'Document.pdf'}</span>
                </div>
             )}
          </div>
        )}

        <div className="markdown-body">
            {isUser ? (
                <p>{message.text}</p>
            ) : (
                <ReactMarkdown 
                    components={{
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 text-bdgreen-900" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 text-bdgreen-900" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2 text-bdgreen-800" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2 text-bdgreen-700" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-bdgreen-800" {...props} />,
                    }}
                >
                    {message.text}
                </ReactMarkdown>
            )}
        </div>
        <span className={`text-[10px] mt-1 block ${isUser ? 'text-bdgreen-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Render Sources/Grounding Data */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="mt-2 ml-1 max-w-[85%] md:max-w-[70%]">
          <p className="text-xs font-semibold text-bdgreen-700 mb-1 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {t(language, 'verifiedSources')}
          </p>
          <div className="flex flex-wrap gap-2">
            {message.sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs bg-white border border-bdgreen-200 text-bdgreen-600 px-2 py-1 rounded-md hover:bg-bdgreen-50 hover:border-bdgreen-300 transition-colors shadow-sm flex items-center max-w-full truncate"
              >
                <span className="truncate max-w-[150px]">{source.title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;