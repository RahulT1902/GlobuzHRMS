import { Request, Response } from "express";
import { DatabaseService } from "../../services/database.service";

export const getSnapshots = async (req: Request, res: Response) => {
  try {
    const snapshots = await DatabaseService.listSnapshots();
    res.json({ success: true, data: snapshots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSnapshot = async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;
    const result = await DatabaseService.createSnapshot(mode || "FULL");
    res.json({ success: true, data: result, message: "Snapshot captured successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreSnapshot = async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, message: "Filename is required" });
    }

    await DatabaseService.restoreSnapshot(filename);
    res.json({ success: true, message: "Database restored successfully. System state has been reverted." });
  } catch (error: any) {
    console.error("Restore Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
