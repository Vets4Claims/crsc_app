-- CRSC Filing Assistant - Initial Database Schema
-- Version: 1.0
-- Date: 2025-12-10

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    profile_completed BOOLEAN DEFAULT FALSE,
    packet_status VARCHAR(50) DEFAULT 'not_started'
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- PERSONAL INFORMATION TABLE
-- ============================================
CREATE TABLE personal_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    middle_initial VARCHAR(10),
    last_name VARCHAR(100),
    ssn_encrypted TEXT, -- Encrypted SSN using pgcrypto
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX idx_personal_information_user_id ON personal_information(user_id);

-- ============================================
-- MILITARY SERVICE TABLE
-- ============================================
CREATE TABLE military_service (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch VARCHAR(50), -- Army, Navy, Air Force, Marine Corps, Coast Guard, Space Force
    service_number VARCHAR(100),
    retired_rank VARCHAR(50),
    retirement_date DATE,
    years_of_service INTEGER,
    retirement_type VARCHAR(100), -- 20+ years, Chapter 61, TERA, TDRL, PDRL
    dd214_uploaded BOOLEAN DEFAULT FALSE,
    retirement_orders_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX idx_military_service_user_id ON military_service(user_id);

-- ============================================
-- VA DISABILITY INFORMATION TABLE
-- ============================================
CREATE TABLE va_disability_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    va_file_number VARCHAR(100),
    current_va_rating INTEGER CHECK (current_va_rating >= 0 AND current_va_rating <= 100),
    va_decision_date DATE,
    has_va_waiver BOOLEAN DEFAULT FALSE,
    receives_crdp BOOLEAN DEFAULT FALSE,
    code_sheet_uploaded BOOLEAN DEFAULT FALSE,
    decision_letter_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX idx_va_disability_info_user_id ON va_disability_info(user_id);

-- ============================================
-- DISABILITY CLAIMS TABLE
-- ============================================
CREATE TABLE disability_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    disability_title VARCHAR(255),
    disability_code VARCHAR(20),
    body_part_affected VARCHAR(255),
    date_awarded_by_va DATE,
    initial_rating_percentage INTEGER CHECK (initial_rating_percentage >= 0 AND initial_rating_percentage <= 100),
    current_rating_percentage INTEGER CHECK (current_rating_percentage >= 0 AND current_rating_percentage <= 100),
    combat_related_code VARCHAR(10), -- PH, AC, HS, SW, IN, AO, RE, GW, MG
    unit_of_assignment VARCHAR(255),
    location_of_injury VARCHAR(255),
    description_of_event TEXT,
    received_purple_heart BOOLEAN DEFAULT FALSE,
    has_secondary_conditions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_disability_claims_user_id ON disability_claims(user_id);

-- ============================================
-- SECONDARY CONDITIONS TABLE
-- ============================================
CREATE TABLE secondary_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_claim_id UUID REFERENCES disability_claims(id) ON DELETE CASCADE,
    disability_code VARCHAR(20),
    description TEXT,
    percentage INTEGER CHECK (percentage >= 0 AND percentage <= 100),
    date_awarded DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for primary claim lookups
CREATE INDEX idx_secondary_conditions_primary_claim_id ON secondary_conditions(primary_claim_id);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- DD214, retirement_orders, va_decision, medical_records, etc.
    file_name VARCHAR(255),
    file_path TEXT, -- Storage path
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE
);

-- Index for user lookups
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);

-- ============================================
-- CHAT HISTORY TABLE
-- ============================================
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    metadata JSONB, -- For storing step, action, requires_input, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups and ordering
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);

-- ============================================
-- PACKET STATUS TABLE
-- ============================================
CREATE TABLE packet_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    step_name VARCHAR(100),
    step_status VARCHAR(50) CHECK (step_status IN ('not_started', 'in_progress', 'completed', 'requires_review')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_packet_status_user_id ON packet_status(user_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_id VARCHAR(255),
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_payment_id ON payments(stripe_payment_id);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB, -- Additional context for the audit entry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_information_updated_at
    BEFORE UPDATE ON personal_information
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_military_service_updated_at
    BEFORE UPDATE ON military_service
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_va_disability_info_updated_at
    BEFORE UPDATE ON va_disability_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disability_claims_updated_at
    BEFORE UPDATE ON disability_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packet_status_updated_at
    BEFORE UPDATE ON packet_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE military_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE va_disability_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE disability_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Personal Information policies
CREATE POLICY "Users can view own personal_information" ON personal_information
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal_information" ON personal_information
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal_information" ON personal_information
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal_information" ON personal_information
    FOR DELETE USING (auth.uid() = user_id);

-- Military Service policies
CREATE POLICY "Users can view own military_service" ON military_service
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own military_service" ON military_service
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own military_service" ON military_service
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own military_service" ON military_service
    FOR DELETE USING (auth.uid() = user_id);

-- VA Disability Info policies
CREATE POLICY "Users can view own va_disability_info" ON va_disability_info
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own va_disability_info" ON va_disability_info
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own va_disability_info" ON va_disability_info
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own va_disability_info" ON va_disability_info
    FOR DELETE USING (auth.uid() = user_id);

-- Disability Claims policies
CREATE POLICY "Users can view own disability_claims" ON disability_claims
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disability_claims" ON disability_claims
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disability_claims" ON disability_claims
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own disability_claims" ON disability_claims
    FOR DELETE USING (auth.uid() = user_id);

-- Secondary Conditions policies (access through disability_claims ownership)
CREATE POLICY "Users can view own secondary_conditions" ON secondary_conditions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM disability_claims
            WHERE disability_claims.id = secondary_conditions.primary_claim_id
            AND disability_claims.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own secondary_conditions" ON secondary_conditions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM disability_claims
            WHERE disability_claims.id = secondary_conditions.primary_claim_id
            AND disability_claims.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own secondary_conditions" ON secondary_conditions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM disability_claims
            WHERE disability_claims.id = secondary_conditions.primary_claim_id
            AND disability_claims.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own secondary_conditions" ON secondary_conditions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM disability_claims
            WHERE disability_claims.id = secondary_conditions.primary_claim_id
            AND disability_claims.user_id = auth.uid()
        )
    );

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Chat History policies
CREATE POLICY "Users can view own chat_history" ON chat_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat_history" ON chat_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Packet Status policies
CREATE POLICY "Users can view own packet_status" ON packet_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packet_status" ON packet_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packet_status" ON packet_status
    FOR UPDATE USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit Log policies (users can only view their own audit entries)
CREATE POLICY "Users can view own audit_log" ON audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(100),
    p_resource_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent, details)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_ip_address, p_user_agent, p_details)
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt SSN
CREATE OR REPLACE FUNCTION encrypt_ssn(p_ssn TEXT, p_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(p_ssn, p_key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt SSN
CREATE OR REPLACE FUNCTION decrypt_ssn(p_encrypted_ssn TEXT, p_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(p_encrypted_ssn, 'base64'), p_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL PACKET STATUS STEPS
-- ============================================

-- Function to initialize packet status for a new user
CREATE OR REPLACE FUNCTION initialize_packet_status(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO packet_status (user_id, step_name, step_status)
    VALUES
        (p_user_id, 'eligibility', 'not_started'),
        (p_user_id, 'personal_information', 'not_started'),
        (p_user_id, 'military_service', 'not_started'),
        (p_user_id, 'va_disability', 'not_started'),
        (p_user_id, 'disability_claims', 'not_started'),
        (p_user_id, 'documents', 'not_started'),
        (p_user_id, 'review', 'not_started'),
        (p_user_id, 'payment', 'not_started'),
        (p_user_id, 'download', 'not_started');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize packet status when a new user is created
CREATE OR REPLACE FUNCTION on_user_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_packet_status(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_on_user_created
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION on_user_created();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'Core user accounts table linked to Supabase Auth';
COMMENT ON TABLE personal_information IS 'PHI - Personal identification and contact information';
COMMENT ON TABLE military_service IS 'Military service history and retirement details';
COMMENT ON TABLE va_disability_info IS 'VA disability rating and related information';
COMMENT ON TABLE disability_claims IS 'Individual disability claims for CRSC application';
COMMENT ON TABLE secondary_conditions IS 'Secondary conditions linked to primary disability claims';
COMMENT ON TABLE documents IS 'Uploaded document metadata and storage references';
COMMENT ON TABLE chat_history IS 'AI chat conversation history';
COMMENT ON TABLE packet_status IS 'Progress tracking for CRSC filing process steps';
COMMENT ON TABLE payments IS 'Payment transactions via Stripe';
COMMENT ON TABLE audit_log IS 'HIPAA-compliant audit trail for PHI access';

COMMENT ON COLUMN personal_information.ssn_encrypted IS 'SSN encrypted using pgp_sym_encrypt - use decrypt_ssn function to retrieve';
COMMENT ON COLUMN disability_claims.combat_related_code IS 'PH=Purple Heart, AC=Armed Conflict, HS=Hazardous Service, SW=Simulating War, IN=Instrument of War, AO=Agent Orange, RE=Radiation Exposure, GW=Gulf War, MG=Mustard Gas';
