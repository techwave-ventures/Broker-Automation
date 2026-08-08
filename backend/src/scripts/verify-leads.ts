import { pool } from '../lib/db.js';
import * as LeadModel from '../models/Lead.js';
import * as SiteVisitModel from '../models/SiteVisit.js';

const TEST_PHONE = '+919999999999';
const TEST_USER = 'test@example.com';

async function verify() {
  console.log('🧪 Starting lead lifecycle verification tests...');

  // Setup test user if not exists
  await pool.query(
    'INSERT INTO users (user_id, email, password_hash, name) VALUES ($1, $1, $2, $3) ON CONFLICT (email) DO NOTHING',
    [TEST_USER, 'hash', 'Test Broker']
  );

  // Clean up existing leads for test phone
  await pool.query('DELETE FROM leads WHERE customer_phone = $1', [TEST_PHONE]);

  // 1. Create Residential lead (without site visit)
  console.log('\nStep 1: Expressing Residential interest...');
  const lead1 = await LeadModel.createLead(
    {
      customerName: 'Test Customer',
      customerPhone: TEST_PHONE,
      category: 'Residential',
      requestedLocality: 'Baner',
      budget: '1 Cr',
      otherReqs: '2 BHK',
      status: 'Browsing (No Visit)',
      leadScore: 'Low',
    },
    TEST_USER
  );

  console.log(`✅ Lead 1 Created: Key=${lead1.key}, Category=${lead1.category}, Status=${lead1.status}, Score=${lead1.leadScore}`);
  if (lead1.category !== 'Residential' || lead1.status !== 'Browsing (No Visit)') {
    throw new Error('Step 1 Failed');
  }

  // 2. Add first site visit (Aug 20)
  console.log('\nStep 2: Booking site visit for Aug 20...');
  const visit1 = await SiteVisitModel.createSiteVisit({
    lead_id: lead1.key!,
    property_id: null,
    appointment_date: new Date('2026-08-20T10:00:00.000Z').toISOString(),
    status: 'Scheduled',
  });
  
  // Set lead status to Upcoming Visit
  await LeadModel.updateLead(lead1.key!, { status: 'Upcoming Visit', leadScore: 'High' }, TEST_USER);
  const lead1_v1 = await LeadModel.getLeadByKey(lead1.key!);
  console.log(`✅ Visit 1 booked. Lead Status=${lead1_v1?.status}, Visits Count=${lead1_v1?.visits?.length}`);
  if (lead1_v1?.status !== 'Upcoming Visit' || lead1_v1?.visits?.length !== 1) {
    throw new Error('Step 2 Failed');
  }

  // 3. Add second site visit (Aug 21)
  console.log('\nStep 3: Booking second site visit for Aug 21...');
  const visit2 = await SiteVisitModel.createSiteVisit({
    lead_id: lead1.key!,
    property_id: null,
    appointment_date: new Date('2026-08-21T11:00:00.000Z').toISOString(),
    status: 'Scheduled',
  });
  
  const lead1_v2 = await LeadModel.getLeadByKey(lead1.key!);
  console.log(`✅ Visit 2 booked. Lead Status=${lead1_v2?.status}, Visits Count=${lead1_v2?.visits?.length}`);
  if (lead1_v2?.visits?.length !== 2) {
    throw new Error('Step 3 Failed');
  }

  // 4. Category Switch: Simulate user asking for Land plot in Wakad
  console.log('\nStep 4: Category switch to Land (Plot in Wakad)...');
  // Lookup existing active leads matching 'Land' category for this phone number
  const existing = await LeadModel.getLeadsByUser(TEST_USER);
  const activeLandLead = existing.find(l => 
    l.customerPhone === TEST_PHONE && 
    l.category === 'Land' && 
    l.status !== 'Closed' && 
    l.status !== 'Lost (Not Interested)'
  );

  if (!activeLandLead) {
    console.log('No active Land lead found. Creating new lead for Land category...');
    const lead2 = await LeadModel.createLead(
      {
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        category: 'Land',
        requestedLocality: 'Wakad',
        budget: '2 Cr',
        otherReqs: 'Plot',
        status: 'Browsing (No Visit)',
        leadScore: 'Low',
      },
      TEST_USER
    );
    console.log(`✅ Lead 2 Created: Key=${lead2.key}, Category=${lead2.category}, Status=${lead2.status}`);
    
    // Check if the original Residential lead is untouched
    const lead1_final = await LeadModel.getLeadByKey(lead1.key!);
    console.log(`ℹ️ Original Residential Lead Status: Key=${lead1_final?.key}, Category=${lead1_final?.category}, Visits Count=${lead1_final?.visits?.length}`);
    if (lead1_final?.category !== 'Residential' || lead1_final?.visits?.length !== 2) {
      throw new Error('Step 4 Failed - original lead was modified');
    }
  } else {
    throw new Error('Step 4 Failed - found active Land lead unexpectedly');
  }

  // 5. Returning user after completed interaction
  console.log('\nStep 5: Closing Land lead and returning as new customer...');
  // Find the newly created Land lead
  const freshLeads = await LeadModel.getLeadsByUser(TEST_USER);
  const landLead = freshLeads.find(l => l.customerPhone === TEST_PHONE && l.category === 'Land');
  
  // Close the Land lead
  await LeadModel.updateLead(landLead!.key!, { status: 'Closed' }, TEST_USER);
  console.log(`Closed Land Lead key ${landLead!.key}.`);

  // Simulate returning user looking for Land again
  const currentLeads = await LeadModel.getLeadsByUser(TEST_USER);
  const activeLandLeadAgain = currentLeads.find(l => 
    l.customerPhone === TEST_PHONE && 
    l.category === 'Land' && 
    l.status !== 'Closed' && 
    l.status !== 'Lost (Not Interested)'
  );

  if (!activeLandLeadAgain) {
    console.log('No active Land lead found because previous one is Closed. Creating a new one...');
    const lead3 = await LeadModel.createLead(
      {
        customerName: 'Test Customer',
        customerPhone: TEST_PHONE,
        category: 'Land',
        requestedLocality: 'Kharadi',
        status: 'Browsing (No Visit)',
        leadScore: 'Low',
      },
      TEST_USER
    );
    console.log(`✅ Lead 3 Created for Returning User: Key=${lead3.key}, Category=${lead3.category}, Locality=${lead3.requestedLocality}`);
  } else {
    throw new Error('Step 5 Failed - reused the closed lead');
  }

  console.log('\n🎉 All lead lifecycle verification tests passed successfully!');
}

verify()
  .catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
