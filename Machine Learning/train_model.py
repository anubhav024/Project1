import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

print("Loading advanced dataset...")
df = pd.read_csv(r'Machine Learning\realistic_system_metrics.csv')

# 1. Correlation Heatmap
corr_matrix = df.corr(numeric_only=True)

plt.figure(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f", vmin=-1, vmax=1)
plt.title('System Metrics Correlation Heatmap')
plt.tight_layout()
plt.savefig(r"Machine Learning\correlation_heatmap.png")
plt.close()
print("-> Saved 'correlation_heatmap.png'")

# 2. Define 3-Tier Ground Truth
def define_risk(row):
    # HIGH RISK (2): Heavy overload, system choking
    if (row['cpu_utility_pct'] > 80.0 or 
        row['memory_in_use_pct'] > 85.0 or  
        row['virtual_memory_pct'] > 80.0):
        return 2 # HIGH

    # MEDIUM RISK (1): System is busy, but not completely frozen
    elif (row['cpu_utility_pct'] > 45.0 or 
          row['memory_in_use_pct'] > 65.0 or  
          row['virtual_memory_pct'] > 60.0):
        return 1 # MEDIUM
        
    # LOW RISK (0): Idle or light browsing
    else:
        return 0 # LOW

df['is_overload'] = df.apply(define_risk, axis=1)

# 3. The Hidden Feature Strategy
X = df[['cpu_utility_pct', 'memory_in_use_pct', 'process_count']]
y = df['is_overload']

# 4. Split Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Train Model
print("Training the Multi-Class Random Forest model...")
model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=6) # Slightly deeper depth for 3 classes
model.fit(X_train, y_train)

# 6. Evaluate Model
print("Evaluating the model...")
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n--- Model Results ---")
print(f"Realistic Accuracy: {accuracy * 100:.2f}%\n")
print("Classification Report:")
# Updated target names to reflect 3 classes!
print(classification_report(y_test, y_pred, target_names=['Low Risk', 'Medium Risk', 'High Risk']))

# 7. Save Model
with open('Machine Learning\system_ai_model.pkl', 'wb') as f:
    pickle.dump(model, f, protocol=4)
print("Advanced 3-Tier model saved successfully!")


# Graph 1: 3x3 Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(7, 5))
# Updated the axis labels for 3 categories
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=['Low', 'Medium', 'High'], 
            yticklabels=['Low', 'Medium', 'High'])
plt.title('AI Confusion Matrix (Low / Med / High)')
plt.ylabel('Actual Truth (Ground Truth)')
plt.xlabel('AI Prediction')
plt.tight_layout()
plt.savefig(r"Machine Learning\confusion_matrix.png")
plt.close()
print("-> Saved 'confusion_matrix.png'")


# Graph 2: Feature Importance
importances = model.feature_importances_
features = X.columns 

plt.figure(figsize=(8, 5))
sns.barplot(x=importances, y=features, hue=features, legend=False, palette='magma')
plt.title('AI Feature Importance: What triggers Risk Levels?')
plt.xlabel('Importance Score (0.0 to 1.0)')
plt.ylabel('System Metric')
plt.tight_layout()
plt.savefig(r"Machine Learning\feature_importance.png")
plt.close()
print("-> Saved 'feature_importance.png'")