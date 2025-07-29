import { createContext, useContext, useState, useEffect } from 'react';

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

      const response = await fetch('http://localhost:5000/api/auth/get-tests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

      const testData = {
        date: new Date().toISOString(),
        result: result.stage,
        confidence: result.confidence,
        status: 'completed',
        recommendations: result.recommendations
      };

      const response = await fetch('http://localhost:5000/api/auth/add-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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