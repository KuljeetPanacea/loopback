import React, { useEffect } from "react";

const DuplexCommunication = () => {
  useEffect(() => {
    const recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      if (event.results[0].isFinal) {
        console.log("User:", transcript);
      }
    };

    const speakText = (text) => {
      recognition.stop(); // Pause STT
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.onend = () => {
        recognition.start(); // Resume STT
      };

      synth.speak(utterance);
    };

    recognition.start();

    // Example: Duplex interaction
    const interval = setInterval(() => {
      speakText("What would you like to do?");
    }, 10000); // Ask a question every 10 seconds

    // Cleanup function to stop recognition and interval on unmount
    return () => {
      recognition.stop();
      clearInterval(interval);
    };
  }, []); // Empty dependency array to ensure the effect runs once

  return (
    <button onClick={() => console.log("Duplex communication running")}>
      Click to Start Duplex Communication
    </button>
  );
};

export default DuplexCommunication;
