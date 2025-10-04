require('dotenv').config();

async function testAPIEndpoint() {
  console.log('🧪 Testing Invoice Send API Endpoint\n');
  console.log('=' .repeat(50));

  // Invoice ID that we know exists and has status 'pending'
  const invoiceId = 'a5db4927-49c1-4d0e-a2ab-4393125777f9';
  
  try {
    console.log(`📡 Testing API endpoint: POST /api/invoices/${invoiceId}/send`);
    console.log('🌐 Server URL: http://localhost:3001');
    
    const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response ok: ${response.ok}`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API call successful!');
      console.log('📧 Result:', JSON.stringify(result, null, 2));
      
      if (result.previewUrl) {
        console.log(`🔗 Email preview URL: ${result.previewUrl}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed');
      console.log('🔍 Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('🔍 Parsed error:', JSON.stringify(errorJson, null, 2));
      } catch {
        console.log('🔍 Raw error text:', errorText);
      }
    }

  } catch (error) {
    console.log('❌ Network/fetch error:', error.message);
    
    // Try alternative port
    console.log('\n🔄 Trying port 3000...');
    try {
      const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`📊 Response status (port 3000): ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API call successful on port 3000!');
        console.log('📧 Result:', JSON.stringify(result, null, 2));
      } else {
        const errorText = await response.text();
        console.log('❌ API call failed on port 3000');
        console.log('🔍 Error:', errorText);
      }
      
    } catch (error2) {
      console.log('❌ Both ports failed:', error2.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 API endpoint test complete');
}

testAPIEndpoint().catch(console.error);