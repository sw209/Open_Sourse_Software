import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
import json

# ---------------------------------------
# 1. Load Dataset
# ---------------------------------------
df = pd.read_csv("Lifestyle_and_Health_dataset.csv")

print("✔ Loaded Columns:")
print(df.columns.tolist())

# ---------------------------------------
# 2. Feature Engineering
# ---------------------------------------

# BMI (이미 데이터에 있지만 혹시 NaN 있으면 대체)
df["BMI"] = df["BMI"].fillna(df["Weight (kg)"] / (df["Height (m)"] ** 2))

# Weekly Exercise Hours 계산:
df["weekly_hours"] = df["Workout_Frequency (days/week)"] * df["Session_Duration (hours)"]

# Clean NaN rows
df = df.dropna(subset=["Age", "BMI", "weekly_hours", "rating"])

# ---------------------------------------
# 3. AI Lifestyle Clustering (BMI + weekly_hours)
# ---------------------------------------

cluster_features = df[["BMI", "weekly_hours"]].copy()

scaler = StandardScaler()
X_scaled = scaler.fit_transform(cluster_features)

kmeans = KMeans(n_clusters=4, random_state=42)
labels = kmeans.fit_predict(X_scaled)

# 클러스터 중심을 원래 값으로 복구
centers_scaled = kmeans.cluster_centers_
centers_original = scaler.inverse_transform(centers_scaled)

lifestyle_centers = []
for i, c in enumerate(centers_original):
    lifestyle_centers.append({
        "cluster": i,
        "BMI": float(c[0]),
        "weekly_hours": float(c[1])
    })

# ---------------------------------------
# 4. Health Score Regression Model
# ---------------------------------------

reg_features = df[["Age", "BMI", "weekly_hours"]]
target = df["rating"]

reg = LinearRegression()
reg.fit(reg_features, target)

coef = {
    "bias": float(reg.intercept_),
    "Age": float(reg.coef_[0]),
    "BMI": float(reg.coef_[1]),
    "weekly_hours": float(reg.coef_[2])
}

# ---------------------------------------
# 5. Save JSON model files
# ---------------------------------------

with open("lifestyle_model.json", "w") as f:
    json.dump(lifestyle_centers, f, indent=4)

with open("health_score_model.json", "w") as f:
    json.dump(coef, f, indent=4)

print("\n Model Export Complete!")
print("→ lifestyle_model.json created")
print("→ health_score_model.json created")
