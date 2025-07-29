// API Configuration - Using environment variables for security and flexibility
export const apiConfig = {
  // Backend API URLs
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  authUrl: import.meta.env.VITE_AUTH_API_URL,
  analyzeUrl: import.meta.env.VITE_ANALYZE_API_URL,

  // External APIs
  chatbotUrl: import.meta.env.VITE_CHATBOT_API_URL,
};

// Validate API configuration
const validateApiConfig = () => {
  const missing = [];
  if (!apiConfig.baseUrl) missing.push("VITE_API_BASE_URL");
  if (!apiConfig.authUrl) missing.push("VITE_AUTH_API_URL");
  if (!apiConfig.analyzeUrl) missing.push("VITE_ANALYZE_API_URL");
  if (!apiConfig.chatbotUrl) missing.push("VITE_CHATBOT_API_URL");

  if (missing.length > 0) {
    console.error("Missing API environment variables:", missing);
    console.error("Please check your .env file and ensure it contains:");
    missing.forEach((key) => console.error(`${key}=your_value_here`));
    throw new Error(`Missing API configuration: ${missing.join(", ")}`);
  }

  console.log("API configuration loaded successfully:", {
    baseUrl: apiConfig.baseUrl,
    authUrl: apiConfig.authUrl,
    analyzeUrl: apiConfig.analyzeUrl,
    chatbotUrl: apiConfig.chatbotUrl,
  });
};

// API endpoints with validation
export const getApiEndpoints = () => {
  validateApiConfig();
  return {
    // Auth endpoints
    auth: {
      login: `${apiConfig.authUrl}/login`,
      signup: `${apiConfig.authUrl}/signup`,
      getTests: `${apiConfig.authUrl}/get-tests`,
      addTest: `${apiConfig.authUrl}/add-test`,
    },

    // Analysis endpoints
    analyze: apiConfig.analyzeUrl,

    // External APIs
    chatbot: apiConfig.chatbotUrl,
  };
};

// Helper function to create headers with auth token
export const createAuthHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// Helper function for API calls with error handling
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API call failed: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API call to ${url} failed:`, error);
    throw error;
  }
};
