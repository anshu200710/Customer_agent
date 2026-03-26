import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7';
const COMPLAINT_URL = `${BASE_URL}/ai_call_complaint.php`;
const API_TIMEOUT = 12000;
const API_HEADERS = { JCBSERVICEAPI: 'MakeInJcb' };

/**
 * Validate machine number by calling external API
 */
export async function validateMachineNumber(machineNo) {
    try {
        const response = await axios.get(
            `${BASE_URL}/get_machine_by_machine_no.php?machine_no=${machineNo}`,
            {
                timeout: API_TIMEOUT,
                headers: API_HEADERS,
                validateStatus: status => status < 500
            }
        );

        if (response.status === 200 && response.data?.status === 1 && response.data?.data) {
            const data = response.data.data;
            return {
                valid: true,
                data: {
                    name: data.customer_name || 'Unknown',
                    city: data.city || 'Unknown',
                    model: data.machine_model || 'Unknown',
                    machineNo: data.machine_no || machineNo,
                    phone: data.customer_phone_no || 'Unknown',
                    subModel: data.sub_model || 'NA',
                    machineType: data.machine_type || 'Warranty',
                    businessPartnerCode: data.business_partner_code || 'NA',
                    purchaseDate: data.purchase_date || 'NA',
                    installationDate: data.installation_date || 'NA',
                }
            };
        }

        return { valid: false };

    } catch (err) {
        console.error('❌ [API] Machine validation error:', err.message);
        return { valid: false };
    }
}

/**
 * Find machine by phone number
 */
export async function findMachineByPhone(phone) {
    if (!phone || phone.length < 8) {
        return { valid: false };
    }

    try {
        const response = await axios.get(
            `${BASE_URL}/get_machine_by_phone.php?phone=${phone}`,
            {
                timeout: API_TIMEOUT,
                headers: API_HEADERS,
                validateStatus: status => status < 500
            }
        );

        if (response.status === 200 && response.data?.status === 1 && response.data?.data) {
            const data = response.data.data;
            return {
                valid: true,
                data: {
                    name: data.customer_name || 'Unknown',
                    city: data.city || 'Unknown',
                    model: data.machine_model || 'Unknown',
                    machineNo: data.machine_no || phone,
                    phone: data.customer_phone_no || phone,
                    subModel: data.sub_model || 'NA',
                    machineType: data.machine_type || 'Warranty',
                    businessPartnerCode: data.business_partner_code || 'NA',
                    purchaseDate: data.purchase_date || 'NA',
                    installationDate: data.installation_date || 'NA',
                }
            };
        }

        return { valid: false };

    } catch (err) {
        console.error('❌ [API] Phone lookup error:', err.message);
        return { valid: false };
    }
}

/**
 * Get existing complaint for a machine
 */
export async function getExistingComplaint(machineNo) {
    if (!machineNo) {
        return { found: false };
    }

    try {
        const response = await axios.get(
            `${BASE_URL}/get_complaint_by_machine.php?machine_no=${machineNo}`,
            {
                timeout: API_TIMEOUT,
                headers: API_HEADERS,
                validateStatus: status => status < 500
            }
        );

        if (response.status === 200 && response.data?.status === 1 && response.data?.data) {
            const data = response.data.data;
            return {
                found: true,
                complaintId: data.complaint_sap_id || data.sap_id || data.complaint_id || 'N/A',
                status: data.status || 'open',
                engineerName: data.engineer_name || null,
                assignedDate: data.assigned_date || null,
            };
        }

        return { found: false };

    } catch (err) {
        console.error('❌ [API] Complaint lookup error:', err.message);
        return { found: false };
    }
}

/**
 * Escalate complaint to engineer
 */
export async function escalateToEngineer(complaintId, callerPhone) {
    if (!complaintId) return;

    try {
        await axios.post(
            `${BASE_URL}/escalate_complaint.php`,
            {
                complaint_id: complaintId,
                caller_phone: callerPhone,
                reason: 'Customer called again — engineer not arrived'
            },
            {
                timeout: API_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    ...API_HEADERS
                },
                validateStatus: status => status < 500
            }
        );

        console.log(`   🚨 [API] Escalated complaint: ${complaintId}`);

    } catch (err) {
        console.error('❌ [API] Escalate error:', err.message);
    }
}

/**
 * Submit complaint to backend
 */
export async function submitComplaint(callData) {
    try {
        const data = callData.extractedData;
        const customer = callData.customerData || {};

        if (!data.job_location) {
            data.job_location = 'Onsite';
        }

        const payload = {
            machine_no: data.machine_no || 'Unknown',
            customer_name: data.customer_name || customer.name || 'Unknown',
            caller_name: data.customer_name || customer.name || 'Customer',
            caller_no: data.customer_phone || customer.phone || callData.callingNumber || 'Unknown',
            contact_person: data.customer_name || customer.name || 'Customer',
            contact_person_number: data.customer_phone || customer.phone || callData.callingNumber || 'Unknown',
            machine_model: customer.model || 'Unknown',
            sub_model: customer.subModel || 'NA',
            installation_date: customer.installationDate || '2025-01-01',
            machine_type: customer.machineType || 'Warranty',
            city_id: data.city_id || '4',
            complain_by: 'Customer',
            machine_status: data.machine_status || 'Running With Problem',
            job_location: data.job_location,
            branch: data.branch || 'JAIPUR',
            outlet: data.outlet || 'JAIPUR',
            complaint_details: data.complaint_details || 'Not provided',
            complaint_title: data.complaint_title || 'General Problem',
            sub_title: data.complaint_subtitle || 'Other',
            business_partner_code: customer.businessPartnerCode || 'NA',
            complaint_sap_id: 'NA',
            machine_location_address: data.machine_location_address || 'Not provided',
            pincode: '0',
            service_date: '',
            from_time: '',
            to_time: '',
            job_open_lat: data.lat || 0,
            job_open_lng: data.lng || 0,
            job_close_lat: data.job_close_lat || 0,
            job_close_lng: data.job_close_lng || 0,
        };

        console.log('📤 [API] Submitting complaint:', JSON.stringify(payload, null, 2));

        const response = await axios.post(COMPLAINT_URL, payload, {
            timeout: API_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                ...API_HEADERS
            },
            validateStatus: status => status < 500,
        });

        if (response.status === 200 && response.data?.status === 1) {
            const sapId = response.data.data?.complaint_sap_id || response.data.data?.sap_id;
            console.log(`✅ [API] Complaint submitted: SAP ID ${sapId}`);
            return {
                success: true,
                sapId,
                jobId: response.data.data?.job_id
            };
        }

        console.error('❌ [API] Complaint submission failed:', response.data?.message);
        return { success: false };

    } catch (err) {
        console.error('❌ [API] Submit error:', err.message);
        return { success: false };
    }
}

export default {
    validateMachineNumber,
    findMachineByPhone,
    getExistingComplaint,
    escalateToEngineer,
    submitComplaint
};