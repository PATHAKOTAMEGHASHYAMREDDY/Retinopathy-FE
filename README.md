# Retinopathy Detection Frontend

A web-based user interface for a Diabetic Retinopathy (DR) detection system. This frontend facilitates image uploading and displays diagnostic results processed by a deep learning backend.

## Features

* **Retinal Image Upload**: Interface for submitting fundus photography.
* **Severity Grading**: Visualizes classification results across five stages (No DR, Mild, Moderate, Severe, Proliferative DR).
* **Probability Metrics**: Displays confidence scores for the model's predictions.
* **Responsive Interface**: Built for cross-device compatibility in clinical or research settings.

## Technology Stack

* **Framework**: React.js
* **State Management**: React Hooks
* **HTTP Client**: Axios (for backend API communication)
* **Styling**: Tailwind CSS / CSS Modules

## Installation

1. **Clone the repository**:
```bash
git clone https://github.com/PATHAKOTAMEGHASHYAMREDDY/Retinopathy-FE.git

```


2. **Install dependencies**:
```bash
cd Retinopathy-FE
npm install

```


3. **Configure Environment**:
Create a `.env` file in the root directory and specify the backend API URL:
```env
REACT_APP_API_URL=http://your-backend-api-endpoint

```


4. **Run the application**:
```bash
npm start

```



## Workflow

1. User uploads a fundus image through the dashboard.
2. The frontend sends the image to the linked inference server.
3. The server processes the image using a Convolutional Neural Network (CNN).
4. The frontend renders the predicted class and associated probability data.

## License

[MIT](https://choosealicense.com/licenses/mit/)
