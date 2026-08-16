import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

let stompClient = null;

export const ChatPage2 = () => {
  const history = useHistory();

  // =====================================================
  // STATES
  // =====================================================

  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const [publicChats, setPublicChats] = useState([]);

  const [privateChats, setPrivateChats] = useState(
    new Map()
  );

  const [tab, setTab] = useState("CHATROOM");

  // Media
  const [media, setMedia] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [fileName, setFileName] = useState("");

  // =====================================================
  // GET USERNAME
  // =====================================================

  useEffect(() => {
    const storedUsername =
      localStorage.getItem("chat-username");

    console.log("👤 Username:", storedUsername);

    if (
      !storedUsername ||
      storedUsername.trim() === ""
    ) {
      history.push("/login");
      return;
    }

    setUsername(storedUsername.trim());
  }, [history]);

  // =====================================================
  // WEBSOCKET CONNECTION
  // =====================================================

  useEffect(() => {
    if (!username) return;

    console.log("🔌 Connecting WebSocket...");

    const socket = new SockJS(
  "https://real-time-chatapplication-1.onrender.com/ws"
);

    stompClient = Stomp.over(socket);

    // Remove STOMP debug messages
    stompClient.debug = null;

    stompClient.connect(
      {},
      () => {
        console.log("✅ WebSocket Connected");

        // =================================================
        // PUBLIC CHAT SUBSCRIPTION
        // =================================================

        stompClient.subscribe(
          "/chatroom/public",
          (payload) => {
            try {
              const received =
                JSON.parse(payload.body);

              console.log(
                "🔥 RECEIVED PUBLIC MESSAGE:",
                received
              );

              // -------------------------------
              // JOIN
              // -------------------------------

              if (
                received.status === "JOIN"
              ) {
                console.log(
                  "👤 USER JOINED:",
                  received.senderName
                );

                // Don't display JOIN as chat message
                if (
                  received.senderName !==
                  username
                ) {
                  setPrivateChats(
                    (oldChats) => {
                      const newChats =
                        new Map(oldChats);

                      if (
                        !newChats.has(
                          received.senderName
                        )
                      ) {
                        newChats.set(
                          received.senderName,
                          []
                        );
                      }

                      return newChats;
                    }
                  );
                }

                return;
              }

              // -------------------------------
              // LEAVE
              // -------------------------------

              if (
                received.status === "LEAVE"
              ) {
                console.log(
                  "👋 USER LEFT:",
                  received.senderName
                );

                return;
              }

              // -------------------------------
              // PUBLIC MESSAGE
              // -------------------------------

              if (
                received.status === "MESSAGE"
              ) {
                console.log(
                  "💬 PUBLIC MESSAGE:",
                  received
                );

                setPublicChats(
                  (oldChats) => [
                    ...oldChats,
                    received,
                  ]
                );
              }
            } catch (error) {
              console.error(
                "❌ Error reading public message:",
                error
              );
            }
          }
        );

        console.log(
          "📢 Subscribed to /chatroom/public"
        );

        // =================================================
        // PRIVATE CHAT SUBSCRIPTION
        // =================================================

        stompClient.subscribe(
          `/user/${username}/private`,
          (payload) => {
            try {
              const received =
                JSON.parse(payload.body);

              console.log(
                "🔒 RECEIVED PRIVATE MESSAGE:",
                received
              );

              setPrivateChats(
                (oldChats) => {
                  const newChats =
                    new Map(oldChats);

                  const oldMessages =
                    newChats.get(
                      received.senderName
                    ) || [];

                  newChats.set(
                    received.senderName,
                    [
                      ...oldMessages,
                      received,
                    ]
                  );

                  return newChats;
                }
              );
            } catch (error) {
              console.error(
                "❌ Error reading private message:",
                error
              );
            }
          }
        );

        console.log(
          `🔒 Subscribed to /user/${username}/private`
        );

        // =================================================
        // SEND JOIN MESSAGE
        // =================================================

        const joinMessage = {
          senderName: username,
          receiverName: null,
          message: "",
          media: "",
          mediaType: null,
          status: "JOIN",
        };

        console.log(
          "👤 Sending JOIN:",
          joinMessage
        );

        stompClient.send(
          "/app/message",
          {},
          JSON.stringify(joinMessage)
        );
      },
      (error) => {
        console.error(
          "❌ WebSocket Error:",
          error
        );
      }
    );

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      console.log(
        "🔌 Disconnecting WebSocket..."
      );

      if (
        stompClient &&
        stompClient.connected
      ) {
        try {
          stompClient.disconnect();
        } catch (error) {
          console.log(
            "Disconnect error:",
            error
          );
        }
      }

      stompClient = null;
    };
  }, [username]);

  // =====================================================
  // MEDIA / FILE HANDLER
  // =====================================================

  const handleMediaChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    console.log("📁 Selected file:", file);

    // Only allow image/video
    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      alert(
        "Please select an image or video file."
      );

      e.target.value = "";
      return;
    }

    // File size limit
    // Base64 is large, so keep files below 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Please select a file smaller than 5 MB."
      );

      e.target.value = "";
      return;
    }

    setFileName(file.name);

    const type = file.type.split("/")[0];

    setMediaType(type);

    const reader = new FileReader();

    reader.onload = () => {
      console.log(
        "✅ File converted to Base64"
      );

      setMedia(reader.result);
    };

    reader.onerror = (error) => {
      console.error(
        "❌ File reading error:",
        error
      );
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // CLEAR MEDIA
  // =====================================================

  const clearMedia = () => {
    setMedia("");
    setMediaType("");
    setFileName("");

    const fileInput =
      document.getElementById("file");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // =====================================================
  // SEND PUBLIC MESSAGE
  // =====================================================

  const sendMessage = () => {
    if (
      !message.trim() &&
      !media
    ) {
      return;
    }

    if (
      !stompClient ||
      !stompClient.connected
    ) {
      console.error(
        "❌ WebSocket is not connected"
      );

      alert(
        "WebSocket is not connected. Please refresh the page."
      );

      return;
    }

    const chatMessage = {
      senderName: username,
      receiverName: null,
      message: message.trim(),
      media: media || "",
      mediaType: mediaType || null,
      status: "MESSAGE",
    };

    console.log(
      "📤 SENDING PUBLIC MESSAGE:",
      chatMessage
    );

    stompClient.send(
      "/app/message",
      {},
      JSON.stringify(chatMessage)
    );

    setMessage("");

    clearMedia();
  };

  // =====================================================
  // SEND PRIVATE MESSAGE
  // =====================================================

  const sendPrivateMessage = () => {
    if (
      !message.trim() &&
      !media
    ) {
      return;
    }

    if (
      !stompClient ||
      !stompClient.connected
    ) {
      console.error(
        "❌ WebSocket is not connected"
      );

      alert(
        "WebSocket is not connected."
      );

      return;
    }

    if (tab === "CHATROOM") {
      sendMessage();
      return;
    }

    const chatMessage = {
      senderName: username,
      receiverName: tab,
      message: message.trim(),
      media: media || "",
      mediaType: mediaType || null,
      status: "MESSAGE",
    };

    console.log(
      "📤 SENDING PRIVATE MESSAGE:",
      chatMessage
    );

    // =================================================
    // SHOW MY PRIVATE MESSAGE IMMEDIATELY
    // =================================================

    setPrivateChats(
      (oldChats) => {
        const newChats =
          new Map(oldChats);

        const oldMessages =
          newChats.get(tab) || [];

        newChats.set(tab, [
          ...oldMessages,
          chatMessage,
        ]);

        return newChats;
      }
    );

    // =================================================
    // SEND TO BACKEND
    // =================================================

    stompClient.send(
      "/app/private-message",
      {},
      JSON.stringify(chatMessage)
    );

    setMessage("");

    clearMedia();
  };

  // =====================================================
  // ENTER KEY
  // =====================================================

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (tab === "CHATROOM") {
        sendMessage();
      } else {
        sendPrivateMessage();
      }
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    if (
      stompClient &&
      stompClient.connected
    ) {
      try {
        const leaveMessage = {
          senderName: username,
          receiverName: null,
          message: "",
          media: "",
          mediaType: null,
          status: "LEAVE",
        };

        stompClient.send(
          "/app/message",
          {},
          JSON.stringify(leaveMessage)
        );

        stompClient.disconnect();
      } catch (error) {
        console.log(error);
      }
    }

    localStorage.removeItem(
      "chat-username"
    );

    history.push("/login");
  };

  // =====================================================
  // RENDER MEDIA
  // =====================================================

  const renderMedia = (chat) => {
    if (
      !chat ||
      !chat.media
    ) {
      return null;
    }

    // =================================================
    // IMAGE
    // =================================================

    if (
      chat.mediaType === "image" ||
      chat.media.startsWith("data:image/")
    ) {
      return (
        <img
          src={chat.media}
          alt="Shared media"
          style={{
            width: "250px",
            maxWidth: "100%",
            maxHeight: "300px",
            objectFit: "contain",
            borderRadius: "10px",
            marginTop: "8px",
            display: "block",
          }}
        />
      );
    }

    // =================================================
    // VIDEO
    // =================================================

    if (
      chat.mediaType === "video" ||
      chat.media.startsWith("data:video/")
    ) {
      return (
        <video
          controls
          style={{
            width: "300px",
            maxWidth: "100%",
            maxHeight: "300px",
            borderRadius: "10px",
            marginTop: "8px",
            display: "block",
          }}
        >
          <source
            src={chat.media}
            type={
              chat.media.startsWith(
                "data:video/"
              )
                ? chat.media
                    .split(";")[0]
                    .replace(
                      "data:",
                      ""
                    )
                : "video/mp4"
            }
          />

          Your browser does not support
          video playback.
        </video>
      );
    }

    return null;
  };

  // =====================================================
  // RENDER PUBLIC CHATS
  // =====================================================

  const renderPublicChats = () => {
    if (
      publicChats.length === 0
    ) {
      return (
        <div
          style={{
            textAlign: "center",
            color: "#777",
            marginTop: "50px",
          }}
        >
          <div
            style={{
              fontSize: "45px",
            }}
          >
            💬
          </div>

          <div
            style={{
              fontSize: "18px",
              marginTop: "10px",
            }}
          >
            No messages yet
          </div>

          <div
            style={{
              fontSize: "13px",
              marginTop: "5px",
            }}
          >
            Start the conversation!
          </div>
        </div>
      );
    }

    return publicChats.map(
      (chat, index) => {
        const isMine =
          chat.senderName ===
          username;

        return (
          <div
            key={`${index}-${chat.senderName}`}
            style={{
              display: "flex",
              justifyContent:
                isMine
                  ? "flex-end"
                  : "flex-start",
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                maxWidth: "500px",
                minWidth: "100px",
                padding: "12px 15px",
                borderRadius: isMine
                  ? "15px 15px 3px 15px"
                  : "15px 15px 15px 3px",
                backgroundColor:
                  isMine
                    ? "#667eea"
                    : "#ffffff",
                color: isMine
                  ? "#ffffff"
                  : "#222222",
                boxShadow:
                  "0 3px 10px rgba(0,0,0,0.12)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                  opacity: 0.75,
                }}
              >
                {chat.senderName}
              </div>

              {chat.message && (
                <div
                  style={{
                    fontSize: "15px",
                    wordBreak:
                      "break-word",
                  }}
                >
                  {chat.message}
                </div>
              )}

              {renderMedia(chat)}
            </div>
          </div>
        );
      }
    );
  };

  // =====================================================
  // RENDER PRIVATE CHATS
  // =====================================================

  const renderPrivateChats = () => {
    const chats =
      privateChats.get(tab) || [];

    if (chats.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            color: "#777",
            marginTop: "50px",
          }}
        >
          <div
            style={{
              fontSize: "45px",
            }}
          >
            👤
          </div>

          <div
            style={{
              fontSize: "18px",
              marginTop: "10px",
            }}
          >
            No messages with {tab}
          </div>
        </div>
      );
    }

    return chats.map(
      (chat, index) => {
        const isMine =
          chat.senderName ===
          username;

        return (
          <div
            key={`${index}-${chat.senderName}`}
            style={{
              display: "flex",
              justifyContent:
                isMine
                  ? "flex-end"
                  : "flex-start",
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                maxWidth: "500px",
                minWidth: "100px",
                padding: "12px 15px",
                borderRadius: isMine
                  ? "15px 15px 3px 15px"
                  : "15px 15px 15px 3px",
                backgroundColor:
                  isMine
                    ? "#667eea"
                    : "#ffffff",
                color: isMine
                  ? "#ffffff"
                  : "#222222",
                boxShadow:
                  "0 3px 10px rgba(0,0,0,0.12)",
              }}
            >
              {!isMine && (
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "5px",
                    opacity: 0.7,
                  }}
                >
                  {chat.senderName}
                </div>
              )}

              {chat.message && (
                <div
                  style={{
                    fontSize: "15px",
                    wordBreak:
                      "break-word",
                  }}
                >
                  {chat.message}
                </div>
              )}

              {renderMedia(chat)}
            </div>
          </div>
        );
      }
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background:
          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily:
          "Arial, sans-serif",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          MAIN CHAT CONTAINER
      ================================================= */}

      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          height: "650px",
          background: "#ffffff",
          borderRadius: "20px",
          overflow: "hidden",
          display: "flex",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* =================================================
            LEFT SIDEBAR
        ================================================= */}

        <div
          style={{
            width: "240px",
            background:
              "linear-gradient(180deg, #f8f9ff, #eef0ff)",
            borderRight:
              "1px solid #ddd",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* APP TITLE */}

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#667eea",
              }}
            >
              💬 ChatApp
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#777",
                marginTop: "5px",
              }}
            >
              Real-time messaging
            </div>
          </div>

          {/* USER */}

          <div
            style={{
              background: "#ffffff",
              padding: "12px",
              borderRadius: "12px",
              marginBottom: "20px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#888",
              }}
            >
              LOGGED IN AS
            </div>

            <div
              style={{
                fontWeight: "bold",
                color: "#333",
                marginTop: "3px",
              }}
            >
              👤 {username}
            </div>
          </div>

          {/* PUBLIC CHAT */}

          <div
            onClick={() =>
              setTab("CHATROOM")
            }
            style={{
              padding: "13px",
              marginBottom: "8px",
              borderRadius: "12px",
              cursor: "pointer",
              background:
                tab === "CHATROOM"
                  ? "#667eea"
                  : "#ffffff",
              color:
                tab === "CHATROOM"
                  ? "#ffffff"
                  : "#333",
              fontWeight: "600",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            💬 Public Chat
          </div>

          {/* PRIVATE USERS */}

          <div
            style={{
              fontSize: "11px",
              color: "#888",
              marginTop: "15px",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            USERS
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {[...privateChats.keys()]
              .filter(
                (user) =>
                  user !== username
              )
              .map((user) => (
                <div
                  key={user}
                  onClick={() =>
                    setTab(user)
                  }
                  style={{
                    padding: "12px",
                    marginBottom: "7px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    background:
                      tab === user
                        ? "#667eea"
                        : "#ffffff",
                    color:
                      tab === user
                        ? "#ffffff"
                        : "#333",
                    fontWeight: "500",
                  }}
                >
                  🟢 {user}
                </div>
              ))}
          </div>

          {/* LOGOUT */}

          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "11px",
              border: "none",
              borderRadius: "10px",
              background: "#dc3545",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: "15px",
            }}
          >
            Logout
          </button>
        </div>

        {/* =================================================
            CHAT AREA
        ================================================= */}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* HEADER */}

          <div
            style={{
              padding: "18px 22px",
              background:
                "linear-gradient(90deg, #667eea, #764ba2)",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              {tab === "CHATROOM"
                ? "💬 Public Chat Room"
                : `🔒 Chat with ${tab}`}
            </div>

            <div
              style={{
                fontSize: "12px",
                opacity: 0.8,
                marginTop: "3px",
              }}
            >
              {tab === "CHATROOM"
                ? "Everyone can see these messages"
                : "Private conversation"}
            </div>
          </div>

          {/* =================================================
              MESSAGE AREA
          ================================================= */}

          <div
            style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
              background: "#f5f6fa",
            }}
          >
            {tab === "CHATROOM"
              ? renderPublicChats()
              : renderPrivateChats()}
          </div>

          {/* =================================================
              SELECTED MEDIA PREVIEW
          ================================================= */}

          {media && (
            <div
              style={{
                padding:
                  "10px 15px",
                background:
                  "#f0f0f0",
                borderTop:
                  "1px solid #ddd",
                display: "flex",
                alignItems:
                  "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#555",
                  flex: 1,
                }}
              >
                📎 {fileName}
              </div>

              {mediaType ===
                "image" && (
                <img
                  src={media}
                  alt="Preview"
                  style={{
                    width: "50px",
                    height: "50px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "8px",
                  }}
                />
              )}

              {mediaType ===
                "video" && (
                <video
                  src={media}
                  style={{
                    width: "70px",
                    height: "50px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "8px",
                  }}
                />
              )}

              <button
                onClick={
                  clearMedia
                }
                style={{
                  border: "none",
                  background:
                    "#dc3545",
                  color:
                    "#ffffff",
                  borderRadius:
                    "50%",
                  width: "30px",
                  height: "30px",
                  cursor:
                    "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* =================================================
              MESSAGE INPUT
          ================================================= */}

          <div
            style={{
              padding: "15px",
              borderTop:
                "1px solid #ddd",
              background:
                "#ffffff",
              display: "flex",
              gap: "10px",
              alignItems:
                "center",
            }}
          >
            {/* FILE BUTTON */}

            <label
              htmlFor="file"
              style={{
                width: "45px",
                height: "45px",
                borderRadius: "10px",
                background:
                  "#f0f1f5",
                display: "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                cursor: "pointer",
                fontSize: "20px",
              }}
              title="Attach image/video"
            >
              📎
            </label>

            <input
              id="file"
              type="file"
              accept="image/*,video/*"
              onChange={
                handleMediaChange
              }
              style={{
                display: "none",
              }}
            />

            {/* MESSAGE INPUT */}

            <input
              type="text"
              value={message}
              placeholder={
                tab === "CHATROOM"
                  ? "Type a public message..."
                  : `Message ${tab}...`
              }
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              style={{
                flex: 1,
                height: "45px",
                padding:
                  "0 15px",
                border:
                  "1px solid #ddd",
                borderRadius:
                  "10px",
                outline: "none",
                fontSize: "15px",
                boxSizing:
                  "border-box",
              }}
            />

            {/* SEND */}

            <button
              onClick={() => {
                if (
                  tab ===
                  "CHATROOM"
                ) {
                  sendMessage();
                } else {
                  sendPrivateMessage();
                }
              }}
              style={{
                height: "45px",
                padding:
                  "0 22px",
                border: "none",
                borderRadius:
                  "10px",
                background:
                  "linear-gradient(135deg, #667eea, #764ba2)",
                color:
                  "#ffffff",
                cursor:
                  "pointer",
                fontWeight:
                  "bold",
                fontSize:
                  "15px",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage2;