
// Flag to track if chatbot is speaking
let isSpeaking = false;
let interruptDetected = false;

// Function to handle sending query and receiving response
// Generate a unique sessionId (you could use a UUID generator or any unique string)
let sessionId = localStorage.getItem('chatSessionId');

if (!sessionId) {
    sessionId = Date.now().toString(); // Use timestamp as a simple unique ID
    localStorage.setItem('chatSessionId', sessionId); // Save it in localStorage to persist across page reloads
}

window.addEventListener('beforeunload', function () {
    speechSynthesis.cancel(); // Cancel ongoing speech
});
async function sendQueryToServer(queryText) {
    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ queryText, sessionId }), // Include sessionId in the request
        });

        const data = await response.json();
        return data.response; // Return the response from the server
    } catch (error) {
        console.error('Error:', error);
        return "Something went wrong while communicating with the server.";
    }
}


// Get the video element
const videoCharacter = document.getElementById('video-character');
let defaultVideoPath = 'defa.mp4'; // Path to the default video

// Function to smoothly transition between videos
function changeVideo(path) {
    // Fade out the current video
    videoCharacter.style.opacity = 0;

    // Use a transitionend event to ensure the video change occurs after the fade-out
    videoCharacter.addEventListener('transitionend', () => {
        // Change the video source and reload it after fade-out
        videoCharacter.src = path;
        videoCharacter.load();  // Reload the video
        videoCharacter.play();  // Play the new video
        
        // Fade in the new video
        videoCharacter.style.opacity = 1;
    }, { once: true }); // Use { once: true } to ensure the listener is removed after execution
}


// Load the default video on page load with looping enabled
window.onload = function () {
    videoCharacter.src = defaultVideoPath;
    videoCharacter.loop = true;  // Set the video to loop
    videoCharacter.play(); // Play the default video
    videoCharacter.style.opacity = 1; // Ensure video is visible
};

// Function to get available voices and select a female voice
let voices = [];

function getVoices() {
    voices = speechSynthesis.getVoices();
    return voices.find(voice => voice.name.toLowerCase().includes('female')) || voices[0]; // Fallback to first voice if no "female" voice found
}

// Function to handle chatbot response with interruption
// Function to handle chatbot response with interruption
async function chatbotReply(userMessage) {
    if (interruptDetected) return; // If interrupt detected, do not proceed with chatbot response
  
    const chatOutput = document.getElementById('chat-output');
    chatOutput.innerHTML = ''; // Clear previous messages
  
    // Fetch response from the server (your chatbot logic here)
    const text = await sendQueryToServer(userMessage);
  
    const newMessage = document.createElement('div');
    newMessage.textContent = "😀 " + text;
    chatOutput.appendChild(newMessage);
  
    resetMic();
  
    // Prepare the request to Google Text-to-Speech API
    const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyDXaNyDjTE3kbhEyR2KbeMJf7GYH2ka69U', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text: text },  // Text from the chatbot
            voice: {
                languageCode: 'en-US',
                name: 'en-US-Wavenet-F',  // Example: Child-like female voice
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,  // Normal speaking rate
                pitch: 5.0 // Slightly higher pitch for a friendly voice
            }
        })
    });

    const ttsResult = await ttsResponse.json();

    if (ttsResult.audioContent) {
        // Decode the base64 audio content and play it
        const audio = new Audio("data:audio/mp3;base64," + ttsResult.audioContent);

        if (isSpeaking) {
            speechSynthesis.cancel(); // Cancel the current speaking
        }
        
        // Start the chatbot video when the chatbot starts speaking
        audio.onplay = function() {
            changeVideo('video.mp4'); // Change to the chatbot interaction video
            isSpeaking = true;  // Chatbot starts speaking
            interruptDetected = false; // Reset interrupt flag
        };

        // Stop the chatbot video and switch back to the default video when speech ends
        audio.onended = function() {
            changeVideo(defaultVideoPath); // Change back to the default video
            isSpeaking = false;  // Chatbot stops speaking
        };

        // Play the audio
        audio.play();
    }
}

  
  
function resetMic() {
    if (recognizing) {
        recognition.stop(); // Stop the mic
        recognizing = false; // Set recognizing to false
    }
    setTimeout(() => {
        recognition.start(); // Restart the mic
        recognizing = true; // Set recognizing to true
        console.log("recognition started again")
        document.getElementById('micButton').textContent = 'Stop Listening'; // Update button text
    }, 500); // Slight delay before restarting the mic
}

// Function to handle user interruptions
// Function to handle user interruptions
async function handleInterruption() {
    if (isSpeaking && !interruptDetected) {
        interruptDetected = true;  // Mark that an interruption is detected

        // Stop current speech (if browser speech synthesis is still being used)
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        // Change to default video for 2 seconds
        changeVideo(defaultVideoPath);

        setTimeout(async () => {
            // Prepare the hardcoded message to send to Google Text-to-Speech API
            const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyDXaNyDjTE3kbhEyR2KbeMJf7GYH2ka69U', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: "Excuse me, you were saying something? Can you repeat again?" },  // Hardcoded message
                    voice: {
                        languageCode: 'en-US',
                        name: 'en-US-Wavenet-F',  // Example: Child-like female voice
                        ssmlGender: 'FEMALE'
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 1.0,  // Normal speaking rate
                        pitch: 5.0 // Slightly higher pitch for a friendly voice
                    }
                })
            });

            const ttsResult = await ttsResponse.json();

            if (ttsResult.audioContent) {
                // Decode the base64 audio content and play it
                const audio = new Audio("data:audio/mp3;base64," + ttsResult.audioContent);

                // Play the hardcoded message
                audio.onplay = function () {
                    changeVideo('video.mp4');  // Change to chatbot interaction video
                    isSpeaking = true;  // Ensure the flag is set properly
                };

                // Switch back to the default video after the message
                audio.onended = function () {
                    changeVideo(defaultVideoPath);  // Change back to default video
                    interruptDetected = false;  // Reset interruption detection
                    isSpeaking = false;  // Reset speaking flag
                    recognizing = false;
                    recognition.start();  // Automatically start listening
                    toggleMic();  // Start listening again
                };

                // Play the audio
                audio.play();
            }
        }, 2000); // 2 seconds delay
    }
}

// Modified to handle user input and chatbot response with interruption check
document.getElementById('send-button').addEventListener('click', async function () {
    const chatInput = document.getElementById('chat-input');
    const userMessage = chatInput.value;

    if (userMessage.trim() !== '') {
        // If the chatbot is speaking, handle the interruption
        if (isSpeaking) {
            handleInterruption();
        } else {
            // Clear previous chats
            const chatOutput = document.getElementById('chat-output');
            chatOutput.innerHTML = ''; // Clear chat history

            // Display user message
            const userDiv = document.createElement('div');
            userDiv.textContent = "👤 " + userMessage;
            chatOutput.appendChild(userDiv);

            // Clear input field
            chatInput.value = '';

            // Get chatbot reply
            await chatbotReply(userMessage);
        }
    }
});

// Listen for Enter key trigger
document.getElementById('chat-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('send-button').click();
    }
});

// Get microphone button and input field
const micButton = document.getElementById('mic-button');

// Function to toggle the microphone and start speech recognition after interruption





let recognition;
let recognizing = false;

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (event) {
        let transcript = event.results[event.resultIndex][0].transcript.trim();

        // Only proceed if the transcript has valid input (non-empty string)
        if (transcript.length > 0) {
            document.getElementById("chat-input").value = transcript;
            let message = transcript; // Captured message
            document.getElementById('chat-output').innerHTML += `<p>User: ${message}</p>`;

            // Simulate clicking the send button to handle chatbot response
            document.getElementById('send-button').click();
        } else {
            console.log('No valid speech detected, skipping chatbot response.');
        }
    };

    // Automatically restart the mic if it stops (unless manually stopped)
    recognition.onend = function () {
        if (recognizing) {
            recognition.start(); // Automatically restart the mic
            console.log("Microphone restarted");
        } else {
            document.getElementById('micButton').textContent = 'Start Listening';
        }
    };

    // Handle recognition errors
    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            console.log('No speech detected. Restarting...');
            recognition.stop();  // Ensure recognition is stopped first
            recognition.onend = () => {  // Restart after stopping
                recognition.start(); 
            };
        } else if (event.error === 'not-allowed') {
            console.error('Permission to use microphone not granted.');
            recognition.stop();  // Stop recognition when mic is not allowed
            recognizing = false;
        } else if (event.error === 'network') {
            console.error('Network error. Please check your connection.');
            recognition.stop();
            recognizing = false;
        } else {
            console.error('Speech recognition error:', event.error);
            recognition.stop();
            recognizing = false;
        }
    };
}

async function toggleMic() {
    const listeningAnimation = document.getElementById('listening-animation');

    // Check if microphone access has been granted
    const permission = await navigator.permissions.query({ name: 'microphone' });
    
    if (permission.state !== 'granted') {
        alert('Microphone access is required to use this feature. Please grant access and try again.');
        return; // Exit if microphone access is not granted
    }

    if (recognizing) {
        recognition.stop(); // Manually stop recognition
        recognizing = false;
        document.getElementById('micButton').textContent = 'Start Listening';
        listeningAnimation.style.display = 'none'; // Hide animation
    } else {
        recognition.start();
        recognizing = true;
        document.getElementById('micButton').textContent = 'Stop Listening';
        listeningAnimation.style.display = 'block'; // Show animation
    }
}


// Ensure voices are loaded before using them
window.speechSynthesis.onvoiceschanged = getVoices;

// Function to say the welcome message with video change
async function welcomeUser() {
    const welcomeText = "Hello there, my name is Kiki the Rabbit, what's your name?";

    // Prepare the request to Google Text-to-Speech API
    const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyDXaNyDjTE3kbhEyR2KbeMJf7GYH2ka69U', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text: welcomeText },  // Welcome message text
            voice: {
                languageCode: 'en-US',
                name: 'en-US-Wavenet-F',  // Example: Child-like female voice
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,  // Normal speaking rate
                pitch: 5.0 // Slightly higher pitch for a friendly voice
            }
        })
    });

    const ttsResult = await ttsResponse.json();

    if (ttsResult.audioContent) {
        // Decode the base64 audio content and play it
        const audio = new Audio("data:audio/mp3;base64," + ttsResult.audioContent);

        // Hide the welcome button after it's clicked
        document.getElementById('welcome-button').style.display = 'none';

        document.getElementById('background-content').classList.remove('blurred-background');
        // Play the welcome message
        audio.onplay = function () {
            changeVideo('video.mp4'); // Change to the chatbot interaction video
            isSpeaking = true;  // Chatbot starts speaking
        };

        // Change back to the default video when speech ends
        audio.onended = function () {
            changeVideo(defaultVideoPath);  // Change back to the default video
            isSpeaking = false;  // Chatbot stops speaking
        };

        // Play the audio
        audio.play();
    }
}

// Add event listener to the welcome button
document.getElementById('welcome-button').addEventListener('click', welcomeUser);


function toggleChatOutput() {
    const chatOutput = document.getElementById('chat-output');
    const toggleButton = document.getElementById('toggle-chat-button');

    // Check the current display status of chat output
    if (chatOutput.style.display === 'none') {
        chatOutput.style.display = 'block'; // Show chat output
        toggleButton.textContent = 'Hide Text'; // Update button text
    } else {
        chatOutput.style.display = 'none'; // Hide chat output
        toggleButton.textContent = 'View Text'; // Update button text
    }
}
