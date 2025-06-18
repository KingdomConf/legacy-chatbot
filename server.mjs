<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ChatBot</title>
  <style>
    #chat-log {
      height: 400px;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      font-family: Arial, sans-serif;
    }
    #chat-log div {
      margin-bottom: 8px;
      padding: 6px 10px;
      border-radius: 10px;
      display: inline-block;
      max-width: 80%;
      word-wrap: break-word;
    }
    #chat-log div[style*="left"] {
      background-color: #f1f1f1;
      text-align: left;
    }
    #chat-log div[style*="right"] {
      background-color: #d1e7dd;
      text-align: right;
      align-self: flex-end;
    }
    #input-container {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    #chat-input {
      flex: 1;
      padding: 8px;
      font-size: 14px;
      box-sizing: border-box;
    }
    #send-btn {
      padding: 8px 16px;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div id="chat-wrapper" style="position: relative;">
    <button id="minimize-btn" style="position: absolute; right: 16px; top: 16px;">_</button>
    <div id="chat-container">
      <div id="chat-log"></div>
      <div id="input-container">
        <input type="text" id="chat-input" placeholder="Type your message..." />
        <button id="send-btn">Send</button>
      </div>
    </div>
  </div>

  <script>
    function appendMessage(sender, message) {
      const log = document.getElementById("chat-log");
      const entry = document.createElement("div");
      const displaySender = sender === "Bot" ? "LegacyBot" : sender;
      const alignment = sender === "You" ? "right" : "left";
      entry.style.textAlign = alignment;
      entry.innerHTML = `<strong>${displaySender}:</strong> ${message}`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }

    appendMessage("Bot", "Hi there! I'm LegacyBot from Legacy Studio Co., What can I help you with?");

    document.getElementById('chat-input').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendChat();
      }
    });

    document.getElementById('send-btn').addEventListener('click', sendChat);

    let typingBubble;

    async function sendChat() {
      const input = document.getElementById('chat-input');
      const message = input.value.trim();
      if (!message) return;

      appendMessage("You", message);
      input.value = "";

      const threadId = localStorage.getItem('legacybot_thread_id');

      // Show typing bubble
      typingBubble = document.createElement("div");
      typingBubble.textContent = "LegacyBot is typing...";
      typingBubble.style.textAlign = "right";
      typingBubble.style.fontStyle = "italic";
      typingBubble.style.color = "#666";
      typingBubble.style.opacity = "0.7";
      typingBubble.style.marginLeft = "auto";
      document.getElementById("chat-log").appendChild(typingBubble);

      try {
        const response = await fetch("http://localhost:3000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, threadId })
        });

        const data = await response.json();
        if (data.threadId) {
          localStorage.setItem('legacybot_thread_id', data.threadId);
        }

        // Remove typing bubble and show real response
        typingBubble.remove();
        appendMessage("Bot", data.reply);
      } catch (err) {
        typingBubble.remove();
        appendMessage("Bot", "Error connecting to assistant.");
        console.error(err);
      }
    }

    document.getElementById('minimize-btn').addEventListener('click', () => {
      const container = document.getElementById('chat-container');
      if (container.style.display === 'none') {
        container.style.display = 'block';
        document.getElementById('minimize-btn').textContent = '_';
      } else {
        container.style.display = 'none';
        document.getElementById('minimize-btn').textContent = '◉';
      }
    });
  </script>
</body>
</html>
