import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [message, setMessage] = useState("Loading...");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await fetch("http://localhost:5000/", {
          credentials: "include",
        });
        const data = await response.text();
        setMessage(data);
        setIsAuthenticated(data.includes("You are authenticated"));
      } catch (error) {
        console.error("Error checking authentication:", error);
        setMessage("An error occurred while checking authentication.");
      }
    };

    checkAuthentication();
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/register");
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        console.log("Logout successful");
        setIsAuthenticated(false);
        setMessage("You are not authenticated.");
        navigate("/login"); // Kullanıcıyı login sayfasına yönlendir
      } else {
        console.error("Logout failed");
        setMessage("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      setMessage("An error occurred during logout.");
    }
  };

  return (
    <div>
      <h1>Home Page</h1>
      <p>{message}</p>
      {isAuthenticated && <button onClick={handleLogout}>Logout</button>}
      {!isAuthenticated && <button onClick={handleLogin}>Login</button>}
      {!isAuthenticated && <button onClick={handleRegister}>Register</button>}
    </div>
  );
};

export default Home;
