import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../context/AuthContext";
import { getProjects } from "../../services/projectService";
import { getProjectMessages, sendProjectMessage } from "../../services/messageService";
import { FaRegCommentDots, FaPaperPlane } from "react-icons/fa";
import "../../styles/messages.css";

const Messages = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  const [loadingProjects, setLoadingProjects] = useState(true);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (projects.length === 0) return;
    const searchParams = new URLSearchParams(location.search);
    const queryProjId = searchParams.get("projectId");

    if (queryProjId) {
      const matchedProj = projects.find(p => String(p._id) === String(queryProjId));
      if (matchedProj) {
        setSelectedProject(matchedProj);
      }
    } else if (!selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, location.search, selectedProject]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("refreshUnreadCount"));
  }, [messages, selectedProject]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    prevMessagesLengthRef.current = 0; // reset for the new project initial load

    const fetchMessages = async () => {
      try {
        const data = await getProjectMessages(selectedProject._id);
        setMessages(data);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };

    fetchMessages();

    // Set up polling interval to fetch new messages every 4 seconds
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  useEffect(() => {
    if (messages.length === 0) {
      prevMessagesLengthRef.current = 0;
      return;
    }

    const prevLength = prevMessagesLengthRef.current;
    const currentLength = messages.length;

    // Only scroll if message count has actually increased
    if (currentLength > prevLength) {
      const lastMsg = messages[currentLength - 1];
      const isOwnMessage = String(lastMsg?.senderId) === String(user?._id);

      const chatBody = chatBodyRef.current;
      const isNearBottom = chatBody 
        ? (chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight < 180)
        : false;

      // Scroll to bottom on initial load, own sent message, or if user is near the bottom
      if (chatBody && (prevLength === 0 || isOwnMessage || isNearBottom)) {
        chatBody.scrollTo({
          top: chatBody.scrollHeight,
          behavior: "smooth"
        });
      }
    }

    prevMessagesLengthRef.current = currentLength;
  }, [messages, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText || !inputText.trim() || !selectedProject) return;

    const textToSend = inputText.trim();
    setInputText("");

    try {
      const newMsg = await sendProjectMessage(selectedProject._id, textToSend);
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <MainLayout>
      <div className="messages-wrapper">
        {/* Sidebar */}
        <div className="messages-sidebar">
          <div className="sidebar-header">
            <h3>Project Chats</h3>
          </div>
          <div className="project-list">
            {loadingProjects ? (
              <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: "20px", fontSize: "14px" }}>
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: "20px", fontSize: "14px", padding: "0 10px" }}>
                You are not a member of any projects yet.
              </div>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj._id}
                  className={`project-chat-item ${selectedProject?._id === proj._id ? "active" : ""}`}
                  onClick={() => setSelectedProject(proj)}
                >
                  <span className="project-chat-name">{proj.name}</span>
                  <span className="project-chat-desc">{proj.description || "No description"}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Main Section */}
        <div className="chat-main">
          {selectedProject ? (
            <>
              {/* Active Chat Header */}
              <div className="chat-header">
                <div className="chat-header-info">
                  <button type="button" className="mobile-back-btn" onClick={() => setSelectedProject(null)}>
                    ← Back
                  </button>
                  <div>
                    <h4>{selectedProject.name}</h4>
                    <span>{selectedProject.description || "Project Discussion"}</span>
                  </div>
                </div>
                <div>
                  <span>{selectedProject.members?.length || 1} members</span>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="chat-body" ref={chatBodyRef}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
                    No messages yet. Send a message to start the discussion!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = String(msg.senderId) === String(user?._id);
                    return (
                      <div
                        key={msg._id}
                        className={`chat-message-row ${isOwnMessage ? "own" : "other"}`}
                      >
                        {!isOwnMessage && (
                          <span className="chat-message-sender">{msg.senderName}</span>
                        )}
                        <div className="chat-message-bubble">
                          <p>{msg.message}</p>
                        </div>
                        <span className="chat-message-time">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type your message here..."
                  className="chat-input-field"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
                  <FaPaperPlane style={{ marginRight: "8px" }} /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state">
              <FaRegCommentDots className="chat-empty-icon" />
              <h3>No Discussion Selected</h3>
              <p>Choose a project from the list on the left to view the chat and start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
