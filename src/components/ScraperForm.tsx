.formCard {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    border: 1px solid #eee;
    margin-bottom: 20px;
  }
  
  .formHeader {
    padding: 20px;
    border-bottom: 1px solid #eee;
  }
  
  .formTitle {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .formDescription {
    margin: 5px 0 0;
    color: #666;
    font-size: 0.875rem;
  }
  
  .formContent {
    padding: 20px;
  }
  
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .formGroup {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .formLabel {
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .formInput {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .formInput:focus {
    outline: none;
    border-color: #666;
  }
  
  .formInput:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
  
  .errorAlert {
    display: flex;
    gap: 10px;
    padding: 12px;
    background: #fee2e2;
    border-radius: 4px;
    color: #b91c1c;
  }
  
  .errorTitle {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .errorMessage {
    margin: 2px 0 0;
    font-size: 0.875rem;
  }
  
  .successAlert {
    display: flex;
    gap: 10px;
    padding: 12px;
    background: #dcfce7;
    border-radius: 4px;
    color: #166534;
  }
  
  .successTitle {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .successMessage {
    margin: 2px 0 0;
    font-size: 0.875rem;
  }
  
  .formFooter {
    margin-top: 8px;
  }
  
  .submitButton {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: #333;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .submitButton:hover:not(:disabled) {
    background: #444;
  }
  
  .submitButton:disabled {
    background: #999;
    cursor: not-allowed;
  }
  
  .spinningIcon {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Dark theme support */
  .dark-theme .formCard {
    background: #1e1e1e;
    border: 1px solid #333;
  }
  
  .dark-theme .formHeader {
    border-bottom: 1px solid #333;
  }
  
  .dark-theme .formTitle {
    color: #fff;
  }
  
  .dark-theme .formDescription {
    color: #aaa;
  }
  
  .dark-theme .formLabel {
    color: #ddd;
  }
  
  .dark-theme .formInput {
    background: #333;
    border-color: #444;
    color: #fff;
  }
  
  .dark-theme .formInput:focus {
    border-color: #666;
  }
  
  .dark-theme .formInput:disabled {
    background: #222;
  }
  
  .dark-theme .errorAlert {
    background: rgba(239, 68, 68, 0.2);
  }
  
  .dark-theme .successAlert {
    background: rgba(22, 163, 74, 0.2);
  }
  