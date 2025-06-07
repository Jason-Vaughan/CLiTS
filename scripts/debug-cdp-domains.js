#!/usr/bin/env node

import CDP from 'chrome-remote-interface';

async function main() {
  try {
    console.log('Connecting to Chrome...');
    const client = await CDP({ port: 9222 });
    
    console.log('Connected! Available domains:');
    console.log('Client keys:', Object.keys(client));
    
    // Check if Input domain exists and what methods it has
    if (client.Input) {
      console.log('\nInput domain found!');
      console.log('Input methods:', Object.keys(client.Input));
      console.log('Input.enable type:', typeof client.Input.enable);
      
      // Try to enable Input domain
      try {
        console.log('\nTrying to enable Input domain...');
        await client.Input.enable();
        console.log('✅ Input.enable() succeeded!');
      } catch (error) {
        console.log('❌ Input.enable() failed:', error.message);
      }
    } else {
      console.log('\n❌ Input domain NOT found!');
    }
    
    // Check other domains
    const domains = ['Page', 'Runtime', 'DOM', 'Network', 'Console'];
    for (const domain of domains) {
      if (client[domain]) {
        console.log(`✅ ${domain} domain available`);
        if (client[domain].enable) {
          try {
            await client[domain].enable();
            console.log(`  ✅ ${domain}.enable() succeeded`);
          } catch (error) {
            console.log(`  ❌ ${domain}.enable() failed:`, error.message);
          }
        }
      } else {
        console.log(`❌ ${domain} domain NOT available`);
      }
    }
    
    await client.close();
    
  } catch (error) {
    console.error('Failed to connect:', error.message);
  }
}

main().catch(console.error); 