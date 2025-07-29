import React, { useEffect } from "react";

const GoogleTranslate = () => {
  useEffect(() => {
    // Add Google Translate script
    const addScript = () => {
      const script = document.createElement("script");
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    };

    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,te,hi,ta,kn,ml",
          layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          autoDisplay: true,
          gaTrack: true,
        },
        "google_translate_element"
      );
    };

    // Add script if not already present
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      addScript();
    } else {
      // If script exists but element not initialized, initialize it
      if (window.google && window.google.translate) {
        window.googleTranslateElementInit();
      }
    }

    return () => {
      // Cleanup function
      delete window.googleTranslateElementInit;
    };
  }, []);

  return (
    <div className="translate-container">
      <div id="google_translate_element"></div>
      <style jsx="true">{`
        .translate-container {
          display: inline-block;
          min-width: 120px;
        }
        .goog-te-gadget {
          font-family: system-ui, -apple-system, sans-serif !important;
          font-size: 14px !important;
          color: #4B5563 !important;
          margin: 0 !important;
          padding: 0 !important;
          white-space: nowrap !important;
        }
        .goog-te-gadget-simple {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
        }
        .goog-te-gadget img {
          display: none !important;
        }
        .goog-te-menu-value {
          color: #4B5563 !important;
          border: none !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        .goog-te-menu-value:hover {
          color: #2563EB !important;
          text-decoration: none !important;
        }
        .goog-te-menu-value span {
          border: none !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          font-size: 14px !important;
          padding: 0 4px !important;
          color: inherit !important;
        }
        .goog-te-banner-frame {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        .goog-te-menu-frame {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          border-radius: 0.5rem !important;
        }
        /* Hide "Powered by" */
        .goog-logo-link {
          display: none !important;
        }
        .goog-te-gadget span:not(.goog-te-menu-value span) {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleTranslate;
