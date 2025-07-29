import { useState } from "react";
import { motion } from "framer-motion";
import { useTest } from "../../context/TestContext";
import Chatbot from "../../components/Chatbot";
import CloudinaryGallery from "../../components/CloudinaryGallery";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { uploadToCloudinary } from '../../config/cloudinary';

const Test = () => {
  const { incrementTestCount, addTestToHistory } = useTest();
  const [images, setImages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [popupType, setPopupType] = useState('success'); // 'success', 'error', 'warning'
  const [popupMessage, setPopupMessage] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            file,
            preview: reader.result,
            result: null,
            isAnalyzing: false,
            error: null,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            file,
            preview: reader.result,
            result: null,
            isAnalyzing: false,
            error: null,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleAnalyze = async (index) => {
    const image = images[index];
    if (!image || image.isAnalyzing || image.result) return;

    setImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, isAnalyzing: true, error: null } : img
      )
    );

    const formData = new FormData();
    formData.append("image", image.file);

    try {
      // First, upload image to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(image.file, 'scans');
      console.log('Image uploaded to Cloudinary:', cloudinaryResult.secure_url);

      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      // Add Cloudinary URL to the result
      const resultWithCloudinary = {
        ...data,
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id
      };

      setImages((prev) =>
        prev.map((img, i) =>
          i === index ? { ...img, result: resultWithCloudinary, isAnalyzing: false, cloudinaryUrl: cloudinaryResult.secure_url } : img
        )
      );

      // Save image metadata to localStorage for CloudinaryGallery
      const imageData = {
        cloudinaryUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        uploadedAt: new Date().toISOString(),
        fileName: image.file.name,
        analysisResult: data.stage
      };
      
      const existingImages = JSON.parse(localStorage.getItem('cloudinaryImages') || '[]');
      existingImages.push(imageData);
      localStorage.setItem('cloudinaryImages', JSON.stringify(existingImages));

      // Update metrics and history
      incrementTestCount();
      addTestToHistory(resultWithCloudinary);
      console.log("Test added to history with Cloudinary URL:", resultWithCloudinary);
    } catch (err) {
      console.error('Analysis error:', err);
      setImages((prev) =>
        prev.map((img, i) =>
          i === index ? { ...img, error: err.message, isAnalyzing: false } : img
        )
      );
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const generatePDFReport = async () => {
    const analyzedImages = images.filter(img => img.result);
    
    if (analyzedImages.length === 0) {
      // Show error popup instead of alert
      setPopupType('error');
      setPopupMessage('No analyzed images to export. Please analyze at least one image first.');
      setShowDownloadPopup(true);
      setTimeout(() => {
        setShowDownloadPopup(false);
      }, 3000);
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246); // Blue color
      pdf.text('Diabetic Retinopathy Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;

      // User Information (if available from localStorage or context)
      const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
      if (userInfo.name || userInfo.email) {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Patient Information:', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(12);
        if (userInfo.name) {
          pdf.text(`Name: ${userInfo.name}`, 20, yPosition);
          yPosition += 8;
        }
        if (userInfo.email) {
          pdf.text(`Email: ${userInfo.email}`, 20, yPosition);
          yPosition += 8;
        }
        yPosition += 10;
      }

      // Process each analyzed image
      for (let i = 0; i < analyzedImages.length; i++) {
        const image = analyzedImages[i];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = 20;
        }

        // Image Analysis Header
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Analysis ${i + 1}`, 20, yPosition);
        yPosition += 15;

        // Add image to PDF
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          await new Promise((resolve) => {
            img.onload = () => {
              canvas.width = 150;
              canvas.height = 150;
              ctx.drawImage(img, 0, 0, 150, 150);
              
              const imgData = canvas.toDataURL('image/jpeg', 0.8);
              pdf.addImage(imgData, 'JPEG', 20, yPosition, 60, 60);
              resolve();
            };
            img.src = image.preview;
          });
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }

        // Analysis Results (next to image)
        const resultX = 90;
        let resultY = yPosition;

        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Diagnosis:', resultX, resultY);
        resultY += 8;

        pdf.setFontSize(12);
        const isNoDR = image.result.stage.includes("No DR");
        if (isNoDR) {
          pdf.setTextColor(34, 197, 94); // Green for No DR
        } else {
          pdf.setTextColor(239, 68, 68); // Red for DR
        }
        pdf.text(image.result.stage, resultX, resultY);
        resultY += 8;

        pdf.setTextColor(0, 0, 0);
        pdf.text(`Confidence: ${image.result.confidence}%`, resultX, resultY);
        resultY += 15;

        yPosition += 70;

        // Recommendations
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text(isNoDR ? 'Recommendations:' : 'Precautions:', 20, yPosition);
        yPosition += 10;

        const recommendations = isNoDR ? [
          "Maintain strict blood sugar control",
          "Monitor HbA1c levels regularly",
          "Have a dilated eye exam every 12 months",
          "Control blood pressure and keep it below 130/80 mmHg",
          "Maintain healthy cholesterol levels",
          "Eat a balanced and nutritious diet",
          "Exercise regularly",
          "Avoid smoking",
          "Limit alcohol consumption",
          "Take diabetes medications as prescribed"
        ] : [
          "Control blood sugar levels",
          "Aim for an HbA1c level below 7%",
          "Manage blood pressure and keep it below 130/80 mmHg",
          "Control cholesterol levels to protect retinal blood vessels",
          "Get a comprehensive dilated eye exam at least once a year",
          "Eat a healthy, balanced diet",
          "Exercise regularly to improve overall health",
          "Avoid smoking completely",
          "Limit alcohol consumption",
          "Take diabetes medications exactly as prescribed by your doctor"
        ];

        pdf.setFontSize(10);
        recommendations.forEach((rec, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${rec}`, 25, yPosition);
          yPosition += 6;
        });

        // Important Notice for DR cases
        if (!isNoDR) {
          yPosition += 5;
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(12);
          pdf.setTextColor(239, 68, 68);
          pdf.text('⚠ IMPORTANT NOTICE:', 20, yPosition);
          yPosition += 8;
          
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          const notice = 'Please consult with an ophthalmologist immediately for proper diagnosis and treatment plan.';
          const noticeLines = pdf.splitTextToSize(notice, pageWidth - 40);
          pdf.text(noticeLines, 20, yPosition);
          yPosition += noticeLines.length * 6;
        }

        yPosition += 20;
      }

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Generated by Diabetic Retinopathy Detection System', pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      // Save the PDF locally only
      const fileName = `Retinopathy_Report_${new Date().toISOString().split('T')[0]}`;
      
      // Save locally
      pdf.save(`${fileName}.pdf`);
      
      // Show success popup
      setShowDownloadPopup(true);
      
      // Auto-hide popup after 4 seconds
      setTimeout(() => {
        setShowDownloadPopup(false);
      }, 4000);
      
      // Store report metadata locally for tracking
      const reportData = {
        fileName: `${fileName}.pdf`,
        generatedAt: new Date().toISOString(),
        analysisCount: analyzedImages.length,
        localOnly: true
      };
      
      const existingReports = JSON.parse(localStorage.getItem('pdfReports') || '[]');
      existingReports.push(reportData);
      localStorage.setItem('pdfReports', JSON.stringify(existingReports));

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Chatbot />
      
      {/* Download Success Popup */}
      {showDownloadPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-2xl shadow-2xl border border-green-400 max-w-sm"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </motion.div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Report Generated!</h3>
              <p className="text-green-100 text-sm">PDF downloaded to your device successfully.</p>
            </div>
            <motion.button
              onClick={() => setShowDownloadPopup(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
          
          {/* Progress bar animation */}
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4, ease: "linear" }}
            className="mt-4 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div className="h-full bg-white/60 rounded-full"></div>
          </motion.div>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </motion.div>
          Retinal Image Analysis
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-green-100 rounded-full"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">AI Ready</span>
          </motion.div>
          <motion.button
            onClick={generatePDFReport}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
            }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Report
          </motion.button>
        </div>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-white to-gray-50 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
      >
        {/* Image Upload Area */}
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          whileHover={{ scale: 1.02 }}
          className="border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 mb-8 group cursor-pointer"
        >
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <svg
              className="mx-auto h-16 w-16 text-gray-400 group-hover:text-blue-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-gray-600 group-hover:text-gray-800 transition-colors font-medium"
          >
            Drag and drop your retinal image here, or click to select
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-sm text-gray-500"
          >
            Supports JPG, PNG formats • Max size: 10MB
          </motion.p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <motion.label
            htmlFor="file-upload"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
            }}
            whileTap={{ scale: 0.95 }}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Image
          </motion.label>
        </motion.div>

        {/* Images List */}
        <div className="space-y-6">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: index * 0.1,
                type: "spring",
                stiffness: 100,
                damping: 15,
              }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="p-6 border border-gray-200 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex flex-col lg:flex-row items-start gap-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative overflow-hidden rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
                >
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full lg:w-48 h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      Retinal Image {index + 1}
                    </h3>
                    <motion.button
                      onClick={() => handleRemoveImage(index)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Remove
                    </motion.button>
                  </div>

                  {image.error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
                    >
                      <svg
                        className="w-5 h-5 text-red-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium">{image.error}</span>
                    </motion.div>
                  )}

                  {!image.result && !image.isAnalyzing && (
                    <motion.button
                      onClick={() => handleAnalyze(index)}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 10px 25px rgba(34, 197, 94, 0.3)",
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      Analyze with AI
                    </motion.button>
                  )}

                  {image.isAnalyzing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-8 h-8 border-3 border-transparent border-r-blue-400 rounded-full animate-ping"></div>
                      </div>
                      <div>
                        <span className="text-blue-700 font-semibold text-lg">
                          Analyzing Image...
                        </span>
                        <p className="text-blue-600 text-sm">
                          AI is processing your retinal scan
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {image.result && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div
                        className={`p-4 rounded-xl border-2 ${
                          image.result.stage.includes("No DR")
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                            : "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                        }`}
                      >
                        <div
                          className={`text-xl font-bold flex items-center gap-3 ${
                            image.result.stage.includes("No DR")
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              image.result.stage.includes("No DR")
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          >
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              {image.result.stage.includes("No DR") ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              )}
                            </svg>
                          </div>
                          {image.result.stage}
                          <span className="text-sm font-medium px-3 py-1 bg-white/70 rounded-full">
                            {image.result.confidence}% confidence
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-gray-200">
                        <h4
                          className={`font-semibold mb-3 flex items-center gap-2 ${
                            image.result.stage.includes("No DR")
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          <svg
                            className={`w-5 h-5 ${
                              image.result.stage.includes("No DR")
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {image.result.stage.includes("No DR") ? (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            ) : (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            )}
                          </svg>
                          {image.result.stage.includes("No DR")
                            ? "Recommendations"
                            : "Precautions"}
                        </h4>

                        <ul className="space-y-2">
                          {(() => {
                            // Define recommendations based on DR detection
                            const recommendations = image.result.stage.includes(
                              "No DR"
                            )
                              ? [
                                  "Maintain strict blood sugar control",
                                  "Monitor HbA1c levels regularly",
                                  "Have a dilated eye exam every 12 months",
                                  "Control blood pressure and keep it below 130/80 mmHg",
                                  "Maintain healthy cholesterol levels",
                                  "Eat a balanced and nutritious diet",
                                  "Exercise regularly",
                                  "Avoid smoking",
                                  "Limit alcohol consumption",
                                  "Take diabetes medications as prescribed",
                                ]
                              : [
                                  "Control blood sugar levels",
                                  "Aim for an HbA1c level below 7%",
                                  "Manage blood pressure and keep it below 130/80 mmHg",
                                  "Control cholesterol levels to protect retinal blood vessels",
                                  "Get a comprehensive dilated eye exam at least once a year",
                                  "Eat a healthy, balanced diet",
                                  "Exercise regularly to improve overall health",
                                  "Avoid smoking completely",
                                  "Limit alcohol consumption",
                                  "Take diabetes medications exactly as prescribed by your doctor",
                                ];

                            return recommendations.map((rec, i) => (
                              <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:shadow-sm ${
                                  image.result.stage.includes("No DR")
                                    ? "hover:bg-green-50 border border-green-100"
                                    : "hover:bg-red-50 border border-red-100"
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    image.result.stage.includes("No DR")
                                      ? "bg-green-100"
                                      : "bg-red-100"
                                  }`}
                                >
                                  <svg
                                    className={`w-4 h-4 ${
                                      image.result.stage.includes("No DR")
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    {image.result.stage.includes("No DR") ? (
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    ) : (
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    )}
                                  </svg>
                                </div>
                                <span
                                  className={`font-medium leading-relaxed ${
                                    image.result.stage.includes("No DR")
                                      ? "text-green-800"
                                      : "text-red-800"
                                  }`}
                                >
                                  {rec}
                                </span>
                              </motion.li>
                            ));
                          })()}
                        </ul>

                        {/* Additional Alert for DR Detected */}
                        {!image.result.stage.includes("No DR") && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-4 p-4 bg-gradient-to-r from-red-100 to-pink-100 border border-red-200 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h5 className="font-bold text-red-800">
                                  Important Notice
                                </h5>
                                <p className="text-red-700 text-sm">
                                  Please consult with an ophthalmologist
                                  immediately for proper diagnosis and treatment
                                  plan.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Positive Reinforcement for No DR */}
                        {image.result.stage.includes("No DR") && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h5 className="font-bold text-green-800">
                                  Great News!
                                </h5>
                                <p className="text-green-700 text-sm">
                                  No signs of diabetic retinopathy detected.
                                  Continue following these recommendations to
                                  maintain eye health.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Guidelines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white to-blue-50 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Image Guidelines
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              text: "Use clear, high-resolution retinal images",
              icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
            },
            {
              text: "Ensure proper lighting and focus",
              icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
            },
            {
              text: "Center the retina in the image",
              icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
            },
            {
              text: "Avoid blurry or overexposed images",
              icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              text: "Supported formats: JPG, PNG",
              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            },
          ].map((guideline, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                delay: 0.3 + index * 0.1,
                type: "spring",
                stiffness: 100,
                damping: 15,
              }}
              whileHover={{
                scale: 1.05,
                x: 5,
                transition: { duration: 0.2 },
              }}
              className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 group cursor-pointer"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={guideline.icon}
                  />
                </svg>
              </div>
              <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors leading-relaxed">
                {guideline.text}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border border-blue-200"
        >
          <div className="flex items-center gap-2 text-blue-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold">Pro Tip:</span>
          </div>
          <p className="text-blue-600 text-sm mt-1">
            For best results, use fundus camera images or high-quality
            smartphone photos with proper retinal illumination.
          </p>
        </motion.div>
      </motion.div>

      {/* Cloudinary Gallery - Show saved files */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <CloudinaryGallery />
      </motion.div>
    </div>
  );
};

export default Test;
