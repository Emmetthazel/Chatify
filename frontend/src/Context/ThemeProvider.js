import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

// Theme definitions
export const themes = {
  light: {
    name: "Light",
    colors: {
      primary: "#3b82f6",
      secondary: "#1d4ed8",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1e293b",
      textSecondary: "#64748b",
      border: "#e2e8f0",
      accent: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      success: "#10b981",
      card: "#ffffff",
      cardHover: "#f1f5f9",
      input: "#ffffff",
      inputBorder: "#d1d5db",
      inputFocus: "#3b82f6",
      button: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      tab: "#f1f5f9",
      tabActive: "#3b82f6",
      tabText: "#64748b",
      tabTextActive: "#ffffff",
      header: "#3b82f6",
      headerText: "#ffffff",
      chatBubble: "#e0f2fe",
      chatBubbleOwn: "#dbeafe",
      chatBubbleText: "#1e293b",
      chatBubbleTextOwn: "#1e293b",
      sidebar: "#f8fafc",
      sidebarHover: "#e2e8f0",
      messageInput: "#ffffff",
      messageInputBorder: "#d1d5db",
      notification: "#ef4444",
      shadow: "rgba(0, 0, 0, 0.1)",
      shadowHover: "rgba(0, 0, 0, 0.15)",
    },
    gradients: {
      primary: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      header: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      card: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    },
  },
  dark: {
    name: "Dark",
    colors: {
      primary: "#6366f1",
      secondary: "#4f46e5",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f1f5f9",
      textSecondary: "#94a3b8",
      border: "#334155",
      accent: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      success: "#10b981",
      card: "#1e293b",
      cardHover: "#334155",
      input: "#334155",
      inputBorder: "#475569",
      inputFocus: "#6366f1",
      button: "#6366f1",
      buttonHover: "#4f46e5",
      buttonText: "#ffffff",
      tab: "#334155",
      tabActive: "#6366f1",
      tabText: "#94a3b8",
      tabTextActive: "#ffffff",
      header: "#6366f1",
      headerText: "#ffffff",
      chatBubble: "#334155",
      chatBubbleOwn: "#6366f1",
      chatBubbleText: "#f1f5f9",
      chatBubbleTextOwn: "#ffffff",
      sidebar: "#1e293b",
      sidebarHover: "#334155",
      messageInput: "#334155",
      messageInputBorder: "#475569",
      notification: "#ef4444",
      shadow: "rgba(0, 0, 0, 0.3)",
      shadowHover: "rgba(0, 0, 0, 0.4)",
    },
    gradients: {
      primary: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      header: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
      card: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    },
  },
  organic: {
    name: "Organic",
    colors: {
      primary: "#cd853f",
      secondary: "#a0522d",
      background: "#f4e4bc",
      surface: "#e8c39e",
      text: "#8b4513",
      textSecondary: "#a0522d",
      border: "#d2b48c",
      accent: "#cd853f",
      error: "#b8860b",
      warning: "#daa520",
      success: "#228b22",
      card: "rgba(245, 235, 224, 0.9)",
      cardHover: "rgba(238, 232, 205, 0.95)",
      input: "rgba(255, 250, 240, 0.95)",
      inputBorder: "#d2b48c",
      inputFocus: "#cd853f",
      button: "#d2691e",
      buttonHover: "#cd853f",
      buttonText: "#f5f5dc",
      tab: "rgba(245, 235, 224, 0.9)",
      tabActive: "#cd853f",
      tabText: "#a0522d",
      tabTextActive: "#f5f5dc",
      header: "#cd853f",
      headerText: "#f5f5dc",
      chatBubble: "rgba(245, 235, 224, 0.95)",
      chatBubbleOwn: "#d2b48c",
      chatBubbleText: "#654321",
      chatBubbleTextOwn: "#8b4513",
      sidebar: "rgba(245, 235, 224, 0.8)",
      sidebarHover: "rgba(210, 180, 140, 0.3)",
      messageInput: "rgba(255, 250, 240, 0.95)",
      messageInputBorder: "#d2b48c",
      notification: "#b8860b",
      shadow: "rgba(139, 69, 19, 0.15)",
      shadowHover: "rgba(139, 69, 19, 0.2)",
    },
    gradients: {
      primary: "linear-gradient(135deg, #cd853f 0%, #a0522d 100%)",
      background: "linear-gradient(135deg, #f4e4bc 0%, #e8c39e 50%, #d4a574 100%)",
      header: "linear-gradient(135deg, #cd853f 0%, #a0522d 50%, #8b4513 100%)",
      card: "linear-gradient(135deg, rgba(245, 235, 224, 0.9) 0%, rgba(238, 232, 205, 0.85) 100%)",
    },
  },
};

const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem("selectedTheme");
    return savedTheme || "organic";
  });

  const [theme, setTheme] = useState(themes[currentTheme]);

  useEffect(() => {
    setTheme(themes[currentTheme]);
    localStorage.setItem("selectedTheme", currentTheme);
    
    // Apply theme to document root for CSS variables
    const root = document.documentElement;
    Object.entries(themes[currentTheme].colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    Object.entries(themes[currentTheme].gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value);
    });
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme,
        changeTheme,
        themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider; 