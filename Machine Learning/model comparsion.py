import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import time
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

# --- Import All 8 Machine Learning Models ---
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.ensemble import AdaBoostClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.neural_network import MLPClassifier

print("Loading balanced dataset for the Ultimate Model Benchmark...")
df = pd.read_csv(r"Machine Learning\realistic_system_metrics.csv")

# 1. Define 3-Tier Risk (0=Low, 1=Medium, 2=High)
def define_risk(row):
    if (row['cpu_utility_pct'] > 80.0 or row['memory_in_use_pct'] > 85.0 or 
        row['virtual_memory_pct'] > 80.0):
        return 2 # HIGH
    elif (row['cpu_utility_pct'] > 45.0 or row['memory_in_use_pct'] > 65.0 or 
          row['virtual_memory_pct'] > 60.0):
        return 1 # MEDIUM
    else:
        return 0 # LOW

df['is_overload'] = df.apply(define_risk, axis=1)

# 2. The Hidden Feature Strategy
X = df[['cpu_utility_pct', 'memory_in_use_pct', 'process_count']]
y = df['is_overload']

# 3. Split Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Scale Data (CRITICAL for SVM, KNN, Neural Networks, and Logistic Regression)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 5. Define the 8 Racers
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Decision Tree": DecisionTreeClassifier(random_state=42, max_depth=6),
    "K-Nearest Neighbors": KNeighborsClassifier(n_neighbors=5),
    "Support Vector Machine": SVC(kernel='rbf', probability=True),
    "AdaBoost": AdaBoostClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42, max_depth=6),
    "Neural Network (MLP)": MLPClassifier(hidden_layer_sizes=(50,), max_iter=1000, random_state=42)
}

# 6. Run the Race
results = []
print("\nStarting Model Training Race (This may take a minute with 8 models)...\n")

for name, model in models.items():
    print(f"-> Training {name}...")
    start_time = time.time()
    
    # Train the model
    model.fit(X_train_scaled, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test_scaled)
    
    # Calculate score and time
    accuracy = accuracy_score(y_test, y_pred)
    train_time = time.time() - start_time
    
    # Save the results
    results.append({
        "Model": name,
        "Accuracy": accuracy * 100,
        "Training Time (sec)": train_time
    })

# 7. Print the Leaderboard
results_df = pd.DataFrame(results).sort_values(by="Accuracy", ascending=False)
print("\n" + "="*40)
print("          FINAL LEADERBOARD")
print("="*40)
# formatting the output for a cleaner console view
print(results_df.to_string(index=False, float_format=lambda x: f"{x:.2f}"))
print("="*40 + "\n")

# 8. Generate the Comparison Graph
plt.figure(figsize=(12, 7))
# Create horizontal bar chart
ax = sns.barplot(x='Accuracy', y='Model', data=results_df, palette='viridis')
plt.title('Model Accuracy Comparison for System Monitoring (8 Algorithms)', fontsize=14)
plt.xlabel('Accuracy (%)', fontsize=12)
plt.ylabel('Machine Learning Model', fontsize=12)
plt.xlim(0, 105) # Keep X-axis scaled appropriately 

# Add exact percentage numbers to the end of each bar
for p in ax.patches:
    width = p.get_width()    
    ax.text(width + 1.5,       
            p.get_y() + p.get_height() / 2, 
            f'{width:.2f}%', 
            ha='left', 
            va='center',
            fontweight='bold')

plt.tight_layout()
# Save to your specific folder
plt.savefig(r"Machine Learning\model_comparsion.png")
print("SUCCESS: Saved 8-model comparison graph to 'model_comparison.png'")