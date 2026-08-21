const axios = require('axios');

async function testEndpoints() {
    const baseURL = 'http://localhost:4000/api';
    console.log('Testing Aug 15 restored endpoints...');

    try {
        // 1. Login as Company Owner
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: 'company@admin.com',
            password: '123456'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Login successful as:', loginRes.data.user?.fullName || loginRes.data.user?.name);

        // 2. Test GET /api/companies/my-company
        const myCompRes = await axios.get(`${baseURL}/companies/my-company`, config);
        console.log('✅ GET /api/companies/my-company status:', myCompRes.status, 'Company:', myCompRes.data?.name);
        console.log('   Invoice Settings:', myCompRes.data?.invoiceSettings);

        // 3. Test GET /api/companies/invoice-template
        const templateRes = await axios.get(`${baseURL}/companies/invoice-template`, config);
        console.log('✅ GET /api/companies/invoice-template status:', templateRes.status);

        // 4. Test PATCH /api/companies/invoice-template
        const updateTemplateRes = await axios.patch(`${baseURL}/companies/invoice-template`, {
            companyName: 'KT Construction Ltd',
            defaultTaxRate: 15,
            defaultPaymentTerms: 'Net 15',
            notes: 'Thank you for your business. Please ensure timely payment by the due date.'
        }, config);
        console.log('✅ PATCH /api/companies/invoice-template status:', updateTemplateRes.status, 'Saved defaultTaxRate:', updateTemplateRes.data?.invoiceSettings?.defaultTaxRate);

        // 5. Test Invoices endpoint
        const invoicesRes = await axios.get(`${baseURL}/invoices`, config);
        console.log('✅ GET /api/invoices status:', invoicesRes.status, 'Count:', invoicesRes.data?.length);

        // 6. Test Vendors endpoint
        const vendorsRes = await axios.get(`${baseURL}/vendors`, config);
        console.log('✅ GET /api/vendors status:', vendorsRes.status, 'Count:', vendorsRes.data?.length);

        // 7. Test Purchase Orders endpoint
        const poRes = await axios.get(`${baseURL}/purchase-orders`, config);
        console.log('✅ GET /api/purchase-orders status:', poRes.status, 'Count:', poRes.data?.length);

        console.log('\n🎉 ALL AUG 15 RESTORED ENDPOINTS ARE 100% OPERATIONAL!');
    } catch (err) {
        console.error('❌ Error during testing:', err.response?.status, err.response?.data || err.message);
    }
}

testEndpoints();
