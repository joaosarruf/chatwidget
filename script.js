document.addEventListener("DOMContentLoaded", () => {
  // Get the chat-widget element
  const chatWidget = document.getElementById("chat-widget");
  const chatbotHeader = document.querySelector(".chatbot-header");
  const chatWidgetMsg = document.getElementById("messages");
  const join = document.getElementById("join");
  const input = document.querySelector("#room_data");
  const sendBtn = document.querySelector(".chat_button");
  const restart = document.querySelector("#restartChat");

  let streamingFlag = true;
  let blockUserInputFlag = true;
  let isTyping = false;

  function blockUserInput() {
    if (isTyping) {
      if (!blockUserInputFlag) {
        sendBtn.disabled = false;
      } else {
        sendBtn.disabled = true;
      }
    } else {
      sendBtn.disabled = false;
    }
  }

  let startMsgIndex = 0;

  function botMessage() {
    const agentMsg = document.createElement("div");
    agentMsg.classList.add("bot-message", "startMsg" + startMsgIndex);
    let StartMessage = "Olá! Como posso te ajudar?";
    chatWidgetMsg.appendChild(agentMsg);
    const botMsg = document.querySelector(".startMsg" + startMsgIndex);
    startMsgIndex++;
    if (streamingFlag) {
      typeMessage(StartMessage, botMsg);
    } else {
      agentMsg.textContent = StartMessage;
    }
  }
  // Função para adicionar mensagem ao chat
  const appendMessage = (sender, message) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add(
      "chat-message",
      sender === "user" ? "user-message" : "bot-message"
    );
    messageElement.textContent = `${message}`;
    chatWidgetMsg.appendChild(messageElement);
    scrollDown();
  };

  // Envia mensagem do usuário ao servidor e exibe no chat
  document.getElementById("send_room").addEventListener("submit", (event) => {
    event.preventDefault();
    const userMessage = input.value.trim();
    if (userMessage !== "") {
      appendMessage("user", userMessage);
    }
  });

  function scrollDown() {
    // Selecione o elemento que contém as mensagens
    const messagesContainer = $("#messages");
    setTimeout(() => {
      const containerHeight = messagesContainer.outerHeight();
      const contentHeight = messagesContainer[0].scrollHeight;

      messagesContainer.scrollTop(contentHeight - containerHeight);
    }, 100);
  }

  // Add connection state variable
  let socketConnected = false;

  function generateRandomToken() {
    return Math.random().toString(36).substring(2);
  }

  // Add a click event listener to toggle size
  chatbotHeader.addEventListener("click", (event) => {
    event.preventDefault();
    const isCloseButton = event.target.closest("#minimizeChat");
    chatWidget.classList.toggle("small", isCloseButton);
    chatWidgetMsg.classList.toggle("smallMsg", isCloseButton);

    if (!socketConnected) {
      startSocketConnection();
      botMessage();
    }
  });

  let socket;
  let token;

  emitEvent();

  function emitEvent() {
    token = generateRandomToken();
    // event handler for server sent data
    // the data is displayed in the "Received" section of the page
    // handlers for the different forms in the page
    // these send data to the server in a variety of ways
    $("form#join").submit(function (event) {
      socket.emit("join", { room: $("#join_room").val() });
      return false;
    });
    $("form#send_room").submit(function (event) {
      console.log($("#room_data").val());
      console.log("token: " + token);
      if ($("#room_data").val() != null && $("#room_data").val().length > 0) {
        socket.emit("my_room_event", {
          room: token,
          data: $("#room_data").val(),
        });
        $("#room_data").val("");
      }
      return false;
    });
  }
  function startSocketConnection() {
    if (!token || token == null) {
      token = generateRandomToken();
    }
    socket = io.connect();
    index = 0;

    let lastPingTime = Date.now();
    const pingInterval = 5000; // Defina o intervalo de ping em milissegundos

    function startPingPong() {
      setInterval(() => {
        const currentTime = Date.now();
        const timeSinceLastPing = currentTime - lastPingTime;

        if (timeSinceLastPing > pingInterval * 2) {
          // Se não houver resposta de "pong" por mais de 2 intervalos de ping, considere a conexão perdida
          handleConnectionLost();
        } else {
          // Emitir um evento "ping" para o servidor
          socket.emit("ping");
        }
      }, pingInterval);
    }

    socket.on("pong", function () {
      console.log("Received pong from server");
      // Atualize aqui com a logica para indicar que a conexão está ativa
      lastPingTime = Date.now();
    });

    function handleConnectionLost() {
      const connectionError = document.createElement("div");
      connectionError.id = "connection-error";
      const connectionErrorText = document.createElement("p");
      connectionErrorText.innerText =
        "Oops! Connection lost. Please wait while we restore the connection.";
      connectionError.appendChild(connectionErrorText);
      chatWidget.appendChild(connectionError);
      socketConnected = false;
      token = "";
      console.log("Connection lost");
    }

    socket.on("connect", function () {
      console.log("room: " + token);
      socket.emit("my_event", { data: "I'm connected!" });
      socket.emit("join", { room: token });
      socketConnected = true;
      // Iniciar o mecanismo de "ping-pong" após a conexão
      startPingPong();
      socket.emit("reconnect_attempt", { room: token });
    });

    socket.on("disconnect", function () {
      socketConnected = false;
      token = "";
      console.log("disconnected");
    });
    socket.on("reconnect", function () {
      console.log("Reconnected");
    });

    socket.on("my_response", function (context) {
      lastPingTime = Date.now();
      if (context.result > 0 && context.result !== null) {
        let ranOnce = false;
        function agentMessageLoop() {
          if (!ranOnce && !isTyping) {
            try {
              agentMessage();
              ranOnce = true;
            } catch (error) {
              console.log(error);
            }
          }
          if (!ranOnce) {
            setTimeout(agentMessageLoop, 1000);
          }
        }

        agentMessageLoop();

        function agentMessage() {
          let followtMessage = context.data;
          const agentMessage = document.createElement("div");
          agentMessage.classList.add("bot-message", "follow-message" + index);
          chatWidgetMsg.appendChild(agentMessage);
          const botMsg = document.querySelector(".follow-message" + index);
          typeMessage(followtMessage, botMsg);
          index++;
          scrollDown();
        }
        console.log(context);
      }
    });

    function ShowPopup() {
      // restart.addEventListener('click', (event) => {
      // event.preventDefault();

      const popupBody = document.createElement("div");
      popupBody.classList.add("popup-body", "token" + token);
      const popupText = document.createElement("p");
      popupText.textContent = "Tem certeza que deseja reiniciar o chat?";
      const popupButtons = document.createElement("div");
      popupButtons.classList.add("popup-button");
      const popupButtonYes = document.createElement("button");
      popupButtonYes.textContent = "Sim";
      popupButtonYes.classList.add("yes");
      const popupButtonNo = document.createElement("button");
      popupButtonNo.textContent = "Não";
      popupButtonNo.classList.add("no");
      popupButtons.appendChild(popupButtonYes);
      popupButtons.appendChild(popupButtonNo);
      popupBody.appendChild(popupText);
      popupBody.appendChild(popupButtons);
      chatWidget.appendChild(popupBody);

      const popups = chatWidget.querySelectorAll(".popup-body");

      // const yesButton = chatWidget.querySelector('.yes');
      // const noButton = chatWidget.querySelector('.no');

      function YesBtn() {
        console.log("room: " + token);
        socket.emit("leave", { room: token });
        socket.emit("close_room", { room: token });
        socket.emit("disconnect_request");
        socketConnected = false;
        popups.forEach((popup) => {
          chatWidget.removeChild(popup);
        });
        chatWidget.classList.toggle("small");
        $(chatWidgetMsg).empty();
        startMsgIndex = 0;
        popupButtonYes.removeEventListener("click", YesBtn);
        // });
      }
      popupButtonYes.addEventListener("click", YesBtn);

      function NoBtn() {
        restart.addEventListener("click", CloseSession);
        popups.forEach((popup) => {
          chatWidget.removeChild(popup);
        });
        popupButtonNo.removeEventListener("click", NoBtn);
        // });
      }
      popupButtonNo.addEventListener("click", NoBtn);
    }
    // };
    function CloseSession() {
      ShowPopup();
      restart.removeEventListener("click", CloseSession);
    }
    restart.addEventListener("click", CloseSession);
  }

  function typeMessage(message, container) {
    isTyping = true;
    blockUserInput();
    let index = 0;
    const typing = setInterval(function () {
      container.innerHTML += message.charAt(index);
      index++;
      if (index === message.length) {
        clearInterval(typing);
        isTyping = false;
        blockUserInput();
      }
    }, 50); // Adjust the timing here (e.g., 50 milliseconds)
  }
});
