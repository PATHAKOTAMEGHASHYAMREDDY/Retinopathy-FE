// Model Preloader Service - Ensures fast predictions by warming up the model
import { getApiEndpoints } from '../config/api';

class ModelPreloader {
  constructor() {
    this.isModelReady = false;
    this.isWarming = false;
    this.warmupPromise = null;
    this.statusCheckInterval = null;
  }

  // Check if model is loaded and ready
  async checkModelStatus() {
    try {
      const endpoints = getApiEndpoints();
      const response = await fetch(endpoints.modelStatus, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.isModelReady = data.model_loaded;
        return data;
      }
      return { model_loaded: false, status: 'error' };
    } catch (error) {
      console.error('Error checking model status:', error);
      return { model_loaded: false, status: 'error' };
    }
  }

  // Warm up the model for faster predictions
  async warmupModel() {
    if (this.isWarming || this.isModelReady) {
      return this.warmupPromise || Promise.resolve();
    }

    this.isWarming = true;
    console.log('🔥 Warming up AI model for faster predictions...');

    this.warmupPromise = new Promise(async (resolve, reject) => {
      try {
        const endpoints = getApiEndpoints();
        
        // First check if model is already ready
        const status = await this.checkModelStatus();
        if (status.model_loaded) {
          console.log('✅ Model already loaded and ready!');
          this.isModelReady = true;
          this.isWarming = false;
          resolve();
          return;
        }

        // Warm up the model
        const response = await fetch(endpoints.warmup, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('✅ Model warmed up successfully!');
          this.isModelReady = true;
          this.isWarming = false;
          resolve();
        } else {
          throw new Error('Failed to warm up model');
        }
      } catch (error) {
        console.error('❌ Error warming up model:', error);
        this.isWarming = false;
        reject(error);
      }
    });

    return this.warmupPromise;
  }

  // Start periodic status checking
  startStatusMonitoring() {
    if (this.statusCheckInterval) return;

    this.statusCheckInterval = setInterval(async () => {
      if (!this.isModelReady) {
        const status = await this.checkModelStatus();
        if (status.model_loaded && !this.isModelReady) {
          console.log('✅ Model became ready!');
          this.isModelReady = true;
          this.clearStatusMonitoring();
        }
      }
    }, 2000); // Check every 2 seconds
  }

  // Stop status monitoring
  clearStatusMonitoring() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  // Initialize model preloading
  async initialize() {
    console.log('🚀 Initializing model preloader...');
    
    // Start monitoring model status
    this.startStatusMonitoring();
    
    // Try to warm up the model
    try {
      await this.warmupModel();
    } catch (error) {
      console.warn('Initial warmup failed, will retry when needed:', error);
    }
  }

  // Get current model readiness status
  getStatus() {
    return {
      isReady: this.isModelReady,
      isWarming: this.isWarming,
    };
  }

  // Ensure model is ready before making predictions
  async ensureModelReady() {
    if (this.isModelReady) {
      return true;
    }

    if (this.isWarming) {
      await this.warmupPromise;
      return this.isModelReady;
    }

    // Try to warm up if not already doing so
    try {
      await this.warmupModel();
      return this.isModelReady;
    } catch (error) {
      console.error('Failed to ensure model readiness:', error);
      return false;
    }
  }

  // Cleanup
  destroy() {
    this.clearStatusMonitoring();
    this.warmupPromise = null;
  }
}

// Create singleton instance
const modelPreloader = new ModelPreloader();

export default modelPreloader;

// Export utility functions
export const initializeModelPreloader = () => modelPreloader.initialize();
export const ensureModelReady = () => modelPreloader.ensureModelReady();
export const getModelStatus = () => modelPreloader.getStatus();