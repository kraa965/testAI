import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

// ⚡ store files in RAM
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});

console.log("✅ Gemini API Key loaded:", !!process.env.GEMINI_API_KEY);

app.post("/api/image/edit", upload.single("image"), async (req, res) => {
	let imageBase64 = null;
	let response = null;
	
	try {
		if (!req.file) return res.status(400).json({ error: "No image uploaded" });
		
		// buffer → base64 (NO FILE SAVED)
		imageBase64 = req.file.buffer.toString("base64");
		
		response = await ai.models.generateContent({
			model: "gemini-2.5-flash-image",
			contents: [
				{
					role: "user",
					parts: [
						{
							inlineData: {
								mimeType: req.file.mimetype,
								data: imageBase64,
							},
						},
						{ text: "Make beautiful straight teeth" },
					],
				},
			],
		});
		
		const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
		
		if (!imagePart) {
			return res.json({ text: response.text });
		}
		
		res.json({
			imageBase64: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
		});
		
	} catch (err) {
		console.error("❌ ERROR:", err);
		res.status(500).json({ error: err.message });
	}
	finally {
		// 🧹 CLEAN MEMORY
		req.file = null;
		req.body = null;
		imageBase64 = null;
		response = null;
	}
});

app.listen(3000, () => console.log("🚀 Server http://localhost:3000"));
