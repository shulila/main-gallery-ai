
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers to allow requests from your extension and web app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    console.log(`Received request with action: ${action}`, params);

    // Get API key from environment variables
    const MIDJOURNEY_API_KEY = Deno.env.get('MIDJOURNEY_API_KEY');
    if (!MIDJOURNEY_API_KEY) {
      throw new Error('MIDJOURNEY_API_KEY is not set in environment variables');
    }

    // Switch based on the requested action
    switch (action) {
      case 'authenticate':
        return await handleAuthentication(MIDJOURNEY_API_KEY);
      case 'fetchUserImages':
        return await fetchUserImages(MIDJOURNEY_API_KEY, params);
      case 'generateImage':
        return await generateImage(MIDJOURNEY_API_KEY, params);
      case 'checkJobStatus':
        return await checkJobStatus(MIDJOURNEY_API_KEY, params);
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    console.error('Error in Midjourney function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Handle Midjourney authentication
async function handleAuthentication(apiKey: string) {
  console.log('Authenticating with Midjourney');
  
  try {
    // In production, this would make a real API call to Midjourney
    // For now, we'll simulate an API verification response
    
    // Validate the API key format (this is a simple check, adjust as needed)
    if (!apiKey || apiKey.length < 32) {
      throw new Error('Invalid API key format');
    }
    
    const mockResponse = {
      success: true,
      message: 'Authentication successful',
      userInfo: {
        username: 'TestUser',
        accountStatus: 'active',
        plan: 'standard',
        imagesRemaining: 200,
        memberSince: new Date().toISOString().split('T')[0]
      }
    };

    return new Response(
      JSON.stringify(mockResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error(`Failed to authenticate with Midjourney: ${error.message}`);
  }
}

// Fetch user's images from Midjourney
async function fetchUserImages(apiKey: string, params: any) {
  console.log('Fetching user images from Midjourney', params);
  
  try {
    // Validate parameters
    const limit = params.limit || 10;
    const cursor = params.cursor || null;
    
    // In production, use actual Midjourney API
    // For testing, return more realistic mock data
    
    const mockImages = [
      {
        id: `img-${Date.now()}-1`,
        url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200',
        prompt: 'Vibrant cosmic landscape with nebulas and floating islands',
        createdAt: new Date().toISOString(),
        width: 1024,
        height: 1024,
        status: 'completed',
        model: 'midjourney-v6',
        promptStrength: 7.5
      },
      {
        id: `img-${Date.now()}-2`,
        url: 'https://images.unsplash.com/photo-1673595mny914-576208aba128',
        thumbnailUrl: 'https://images.unsplash.com/photo-1673595mny914-576208aba128?w=200',
        prompt: 'Cyberpunk cityscape at night with neon lights',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        width: 1024,
        height: 1792,
        status: 'completed',
        model: 'midjourney-v6',
        promptStrength: 8.0
      },
      {
        id: `img-${Date.now()}-3`,
        url: 'https://images.unsplash.com/photo-1543874717-039ff2e93d0f',
        thumbnailUrl: 'https://images.unsplash.com/photo-1543874717-039ff2e93d0f?w=200',
        prompt: 'Enchanted forest with magical creatures and glowing plants',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        width: 1792,
        height: 1024,
        status: 'completed',
        model: 'midjourney-v5',
        promptStrength: 6.5
      }
    ];

    // Create a mock pagination response
    const hasMore = cursor !== null;
    const nextCursor = hasMore ? `cursor-${Date.now()}` : null;

    return new Response(
      JSON.stringify({
        success: true,
        images: mockImages,
        pagination: {
          hasMore,
          nextCursor,
          total: 42 // Mock total count
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching images:', error);
    throw new Error(`Failed to fetch images from Midjourney: ${error.message}`);
  }
}

// Generate an image using Midjourney API
async function generateImage(apiKey: string, params: any) {
  console.log('Generating image with Midjourney', params);
  
  if (!params.prompt) {
    throw new Error('Image prompt is required');
  }
  
  try {
    // Validate required parameters
    const prompt = params.prompt;
    const width = params.width || 1024;
    const height = params.height || 1024;
    const promptStrength = params.promptStrength || 7.0;
    
    // In production, make actual API call to Midjourney
    // For testing, return a simulated response with a job ID
    
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const mockGenerationResponse = {
      success: true,
      jobId,
      status: 'processing',
      estimatedTime: '30-45 seconds',
      prompt,
      dimensions: `${width}x${height}`,
      created: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(mockGenerationResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error(`Failed to generate image with Midjourney: ${error.message}`);
  }
}

// New function to check job status
async function checkJobStatus(apiKey: string, params: any) {
  console.log('Checking job status', params);
  
  if (!params.jobId) {
    throw new Error('Job ID is required');
  }
  
  try {
    const jobId = params.jobId;
    
    // In production, make actual API call to Midjourney to check status
    // For testing, simulate a random status based on the job ID
    
    // Randomly determine if the job is complete
    const isComplete = Math.random() > 0.5;
    
    const mockStatus = isComplete ? {
      success: true,
      jobId,
      status: 'completed',
      progress: 100,
      result: {
        imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200',
        width: 1024,
        height: 1024,
        prompt: params.originalPrompt || 'Generated image'
      },
      completedAt: new Date().toISOString()
    } : {
      success: true,
      jobId,
      status: 'processing',
      progress: Math.floor(Math.random() * 80) + 10, // Random progress between 10-90%
      estimatedTimeRemaining: '15 seconds'
    };

    return new Response(
      JSON.stringify(mockStatus),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking job status:', error);
    throw new Error(`Failed to check job status: ${error.message}`);
  }
}
