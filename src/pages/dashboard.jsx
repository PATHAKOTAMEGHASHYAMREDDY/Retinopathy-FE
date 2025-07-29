import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'info', label: 'DR Information', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'test', label: 'Take Test', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'metrics', label: 'Metrics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  const metrics = [
    { label: 'Tests Completed', value: '156', change: '+12%', isPositive: true },
    { label: 'Detection Rate', value: '94%', change: '+3%', isPositive: true },
    { label: 'Avg. Processing Time', value: '2.3s', change: '-0.5s', isPositive: true },
    { label: 'Active Users', value: '2.1k', change: '+15%', isPositive: true },
  ];

  const drStages = [
    {
      stage: 'No DR',
      description: 'No visible signs of diabetic retinopathy',
      recommendation: 'Annual eye examination recommended',
      color: 'bg-green-100 text-green-800'
    },
    {
      stage: 'Mild NPDR',
      description: 'Microaneurysms only',
      recommendation: 'Monitor every 6-8 months',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      stage: 'Moderate NPDR',
      description: 'More microaneurysms, dot and blot hemorrhages',
      recommendation: 'Monitor every 4-6 months',
      color: 'bg-orange-100 text-orange-800'
    },
    {
      stage: 'Severe NPDR',
      description: 'Extensive hemorrhages, venous beading, IRMAs',
      recommendation: 'Immediate referral to ophthalmologist',
      color: 'bg-red-100 text-red-800'
    },
    {
      stage: 'PDR',
      description: 'Neovascularization or vitreous hemorrhage',
      recommendation: 'Urgent treatment required',
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 ease-in-out`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold text-gray-800"
              >
                RetinoAI
              </motion.h2>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <nav className="mt-8">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center p-4 transition-colors ${
                activeSection === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              {isSidebarOpen && (
                <span className="ml-4 font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              {sidebarItems.find((item) => item.id === activeSection)?.label}
            </h1>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Take New Test
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-sm font-medium text-gray-500">{metric.label}</h3>
                <div className="mt-2 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                  <p className={`ml-2 text-sm font-medium ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Sections */}
          {activeSection === 'info' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Understanding Diabetic Retinopathy</h2>
              <p className="text-gray-600 mb-6">
                Diabetic retinopathy is a diabetes complication that affects the eyes. It's caused by damage to the blood vessels of the light-sensitive tissue at the back of the eye (retina). At first, diabetic retinopathy may cause no symptoms or only mild vision problems. Eventually, it can cause blindness.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Stages of Diabetic Retinopathy</h3>
              <div className="space-y-4">
                {drStages.map((stage) => (
                  <div
                    key={stage.stage}
                    className={`p-4 rounded-lg ${stage.color} transition-transform hover:scale-102`}
                  >
                    <h4 className="font-semibold mb-2">{stage.stage}</h4>
                    <p className="text-sm mb-1">{stage.description}</p>
                    <p className="text-sm font-medium">{stage.recommendation}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'test' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Take a New Test</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-4 text-sm text-gray-600">
                  Drag and drop your retinal image here, or click to select
                </p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Upload Image
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'metrics' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Your Test History</h2>
              {/* Add test history table or charts here */}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
