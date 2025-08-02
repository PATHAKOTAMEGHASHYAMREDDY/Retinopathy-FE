import { createContext, useContext, useState, useEffect } from 'react';
import { getApiEndpoints, createAuthHeaders } from '../config/api';

const TestContext = createContext();

export function TestProvider({ children }) {
  const [testCount, setTestCount] = useState(0);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load test history on mount
  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const endpoints = getApiEndpoints();
      const response = await fetch(endpoints.auth.getTests, {
        headers: createAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        setTestHistory(data.tests);
        setTestCount(data.tests.length);
      }
    } catch (error) {
      console.error('Error loading test history:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementTestCount = () => {
    setTestCount(prev => prev + 1);
  };

  const addTestToHistory = async (result) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Format recommendations based on result
      const recommendations = result.stage.includes("No DR") ? [
        "Maintain regular eye check-ups",
        "Control blood sugar levels",
        "Monitor blood pressure",
        "Follow a healthy diet",
        "Exercise regularly"
      ] : [
        "Schedule an appointment with an ophthalmologist",
        "Strictly control blood sugar levels",
        "Take prescribed medications regularly",
        "Monitor blood pressure closely",
        "Follow dietary restrictions"
      ];

      const testData = {
        date: new Date().toISOString(),
        result: result.stage,
        confidence: parseInt(result.confidence),
        status: 'completed',
        recommendations: recommendations,
        cloudinaryUrl: result.cloudinaryUrl || null,
        cloudinaryPublicId: result.cloudinaryPublicId || null
      };

      const endpoints = getApiEndpoints();
      const response = await fetch(endpoints.auth.addTest, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        // Reload test history to get the updated list
        await loadTestHistory();
      } else {
        throw new Error('Failed to save test');
      }
    } catch (error) {
      console.error('Error saving test:', error);
    }
  };

  const value = {
    testCount,
    incrementTestCount,
    testHistory,
    addTestToHistory,
    loading,
    refreshTests: loadTestHistory
  };

  return (
    <TestContext.Provider value={value}>
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
} 