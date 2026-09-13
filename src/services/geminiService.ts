export interface AlternativeSuggestion {
  medicine: string;
  dosage: string;
  reason: string;
}

export async function getMedicineAlternative(
  oosMedicine: string,
  oosDosage: string,
  availableInventory: { medicine: string; dosage: string }[]
): Promise<AlternativeSuggestion | null> {
  try {
    const response = await fetch("/api/get-medicine-alternative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oosMedicine, oosDosage, availableInventory }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error calling get-medicine-alternative API:", error);
  }
  return null;
}
