import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { klineData } = body;

    if (!klineData || !Array.isArray(klineData) || klineData.length === 0) {
      return NextResponse.json({ error: 'Invalid kline data' }, { status: 400 });
    }

    // Convert kline data to CSV format for Python script
    const csvData = klineData.map(kline => ({
      'Open time': kline[0],
      'Open': parseFloat(kline[1]),
      'High': parseFloat(kline[2]),
      'Low': parseFloat(kline[3]),
      'Close': parseFloat(kline[4]),
      'Volume': parseFloat(kline[5]),
      'Close time': kline[6],
    }));

    // Create a promise to handle the Python script execution
    const prediction = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(process.cwd(), 'predict_api.py')
      ]);

      let output = '';
      let errorOutput = '';

      // Send data to Python script via stdin
      pythonProcess.stdin.write(JSON.stringify(csvData));
      pythonProcess.stdin.end();

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${output}`));
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Prediction API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to generate prediction', details: errorMessage },
      { status: 500 }
    );
  }
}