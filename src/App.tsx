import React, { useState, useEffect, useRef } from 'react';
import './App.css';

type Message = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    code?: { code: string; language?: string };
};

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<Message[][]>([]);
    const chatMessagesRef = useRef(null);

    useEffect(() => {
        Prism.highlightAll();
    }, [messages]);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg: Message = {
            id: Date.now(),
            role: 'user',
            content: input,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        // Mock responses from the model for testing
        setTimeout(() => {
            const testMessages: Message[] = [
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Test 1: Standard multi-line code with \n and indentation:',
                    code: {
                        code: "function greet(name) {\n  console.log(\"Hello, \" + name + \"!\");\n}\ngreet(\"World\");",
                        language: 'javascript',
                    },
                },
                {
                    id: Date.now() + 2,
                    role: 'assistant',
                    content: 'Test 2: Very long single line of code:',
                    code: {
                        code: "console.log(\"This is a very long line of JavaScript code that should ideally cause horizontal scrolling if white-space: pre is active and overflow-x: auto is also active on a parent element, which we expect to be the case.\");",
                        language: 'javascript',
                    },
                },
                {
                    id: Date.now() + 3,
                    role: 'assistant',
                    content: 'Test 3: Code with mixed line breaks (CRLF and CR) - testing sanitization:',
                    code: {
                        // Input with \r\n and \r
                        code: "const a = 1;\r\nconst b = 2;\rconst c = 3;",
                        language: 'javascript',
                    },
                },
                {
                    id: Date.now() + 4,
                    role: 'assistant',
                    content: 'Test 4: Empty code string:',
                    code: {
                        code: "",
                        language: 'text',
                    },
                },
                {
                    id: Date.now() + 5,
                    role: 'assistant',
                    content: 'Test 5: Message with code.code as null (should be caught by || \"\" or conditional render):',
                    code: {
                        code: null, // This will be replaced by `|| ""` due to Step 1's change
                        language: 'text',
                    },
                },
                {
                    id: Date.now() + 6,
                    role: 'assistant',
                    content: 'Test 6: Message with undefined code.code (should be caught by || \"\" or conditional render):',
                    code: {
                        code: undefined, // This will be replaced by `|| ""` due to Step 1's change
                        language: 'text',
                    },
                },
                 {
                    id: Date.now() + 7,
                    role: 'assistant',
                    content: 'Test 7: No code block property at all.'
                    // No code property here
                }
            ];

            // Apply sanitization to Test 3's code
            if (testMessages[2].code && testMessages[2].code.code) {
                let rawCode = testMessages[2].code.code;
                // Using RegExp constructor for explicit backslash escaping
                testMessages[2].code.code = rawCode.replace(new RegExp('\\r\\n|\\r', 'g'), '\n');
            }

            // Ensure all code.code fields are strings (as per Step 1 logic, applying it here directly for clarity)
            testMessages.forEach(msg => {
                if (msg.code) {
                    msg.code.code = msg.code.code || "";
                }
            });

            setMessages((prev) => [...prev, ...testMessages]);
        }, 800);
    };

    const handleSaveHistory = () => {
        if (messages.length > 0) {
            setHistory((prev) => [[...messages], ...prev]);
            setMessages([]);
        }
    };

    return (
        <div className="app-container flex flex-col min-h-screen bg-gray-100">
            {/* History Button */}
            <div className="fixed top-4 left-4 z-50">
                <button
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                    onClick={() => setShowHistory(true)}
                    aria-label="Show History"
                >
                    History
                </button>

                {/* History Modal */}
                {showHistory && (
                    <div className="fixed top-0 left-0 w-full h-full bg-gray-500 bg-opacity-50 z-50 flex justify-center items-center">
                        <div className="bg-white rounded-lg p-8 max-w-2xl max-h-screen overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Chat History</h2>
                                <button
                                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                                    onClick={() => setShowHistory(false)}
                                >
                                    Close
                                </button>
                            </div>
                            {history.map((session, index) => (
                                <div key={index} className="mb-6">
                                    <h3 className="text-lg font-semibold mb-2">Session {index + 1}</h3>
                                    {session.map((msg) => (
                                        <div key={msg.id} className={`mb-2 p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <div className="font-bold">{msg.role === 'user' ? 'You:' : 'Model:'}</div>
                                            <div>{msg.content}</div>
                                            {msg.code && msg.code.code && (
                                                <pre className={`language-${msg.code.language}`}>
                                                    <code className={`language-${msg.code.language}`}>
                                                        {msg.code.code}
                                                    </code>
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Window */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
                <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6 flex flex-col">
                    <div className="flex-1 overflow-y-auto mb-4" ref={chatMessagesRef}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left bg-gray-50 rounded px-2 py-1'}`}
                            >
                                <span className={`font-bold ${msg.role === 'user' ? 'text-blue-700' : 'text-green-700'}`}>
                                    {msg.role === 'user' ? 'You:' : 'Model:'}
                                </span>{' '}
                                <span>{msg.content}</span>
                                {msg.code && msg.code.code && (
                                    <pre className={`language-${msg.code.language}`}>
                                        <code className={`language-${msg.code.language}`}>
                                            {msg.code.code}
                                        </code>
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex">
                        <input
                            className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none"
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="הזן הודעה..."
                        />
                        <button
                            className="bg-blue-600 text-white px-5 py-2 rounded-r hover:bg-blue-700 transition"
                            onClick={handleSend}
                        >
                            שלח
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;