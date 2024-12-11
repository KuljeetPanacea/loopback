import React, { useState, useEffect, useRef } from "react";
// import fs from "fs";
import axios from "axios";
const Mp3Recorder = () => {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const ttsFrequencySignature = [500, 1000, 1500]; // Example frequencies of TTS output
  const threshold = 100; // Sensitivity threshold for frequency matching
  const [isProcessing, setIsProcessing] = useState(false);
  const [frequencyData, setFrequencyData] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    let audioStream;

    const initAudioProcessing = async () => {
      try {
        // Step 1: Get microphone input
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();

        // Step 2: Set up analyser
        analyserRef.current.fftSize = 2048;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Step 3: Create audio source from the microphone
        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(audioStream);
        sourceRef.current.connect(analyserRef.current);

        // Step 4: Set up media recorder for saving audio
        mediaRecorderRef.current = new MediaRecorder(audioStream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Step 5: Process audio in real-time
        const processAudio = () => {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Update frequency data for visualization
          setFrequencyData([...dataArray]);

          // Detect if TTS frequencies are present
          const isTTSDetected = ttsFrequencySignature.some((freq) => {
            const index = Math.round(
              (freq / audioContextRef.current.sampleRate) * bufferLength
            );
            return dataArray[index] > threshold;
          });

          if (isTTSDetected) {
            console.log("TTS audio detected, ignoring microphone input.");
          } else {
            console.log("User voice detected.");
            // You can process user voice here (e.g., send it to STT engine)
          }

          if (isProcessing) {
            requestAnimationFrame(processAudio);
          }
        };

        // Start media recorder
        mediaRecorderRef.current.start();
        processAudio();
      } catch (error) {
        console.error("Error initializing audio processing:", error);
      }
    };

    if (isProcessing) {
      initAudioProcessing();
    }

    return () => {
      // Cleanup audio resources
      if (sourceRef.current) sourceRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isProcessing]);
  
  // Save MP3 file
  const saveAudio = async () => {
    
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = "recording.wav";
      link.click();
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      try {
        // Send the audio file with axios POST request
        const response = await axios.post("http://localhost:8080/speech-to-text", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("Audio uploaded successfully:", response.data);

        console.log(response.data);
      } catch (error) {
        console.error("Error uploading audio:", error);
      }
    } else {
      console.log("No audio recorded.");
    }
  };

  // Draw frequency data on canvas
  useEffect(() => {
    if (!canvasRef.current || !frequencyData.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / frequencyData.length) * 2.5;
    let barHeight;
    let x = 0;

    frequencyData.forEach((value) => {
      barHeight = value / 2;
      ctx.fillStyle = `rgb(${barHeight + 100},50,50)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    });
  }, [frequencyData]);

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Audio Processor</h1>
      <button
        onClick={() => setIsProcessing((prev) => !prev)}
        style={{ marginBottom: "20px", padding: "10px 20px" }}
      >
        {isProcessing ? "Stop Processing" : "Start Processing"}
      </button>
      <button
        onClick={saveAudio}
        style={{
          marginLeft: "10px",
          marginBottom: "20px",
          padding: "10px 20px",
        }}
      >
        Save Audio
      </button>
      <div>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          style={{
            border: "1px solid black",
            display: isProcessing ? "block" : "none",
            margin: "auto",
          }}
        ></canvas>
      </div>
    </div>
  );
};

export default Mp3Recorder;
