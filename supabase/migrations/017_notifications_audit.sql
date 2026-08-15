-- Migration: 017_notifications_audit.sql
-- Description: Create domain event bus, notification messages, deliveries, and compliance audit trail tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 017 of 018

-- Table 48: academic_events (Append-Only Domain Event Bus)
CREATE TABLE academic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payload JSONB NOT NULL,
    emitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table 49: notification_messages (Notification Header & Narrative Summary)
CREATE TABLE notification_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES academic_events(id) ON DELETE RESTRICT,
    category VARCHAR(32) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    action_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table 50: notification_deliveries (Per-Recipient Delivery State & Read Tracking)
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES notification_messages(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(16) NOT NULL DEFAULT 'IN_APP',
    delivery_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table 51: audit_events (Strictly Append-Only Legal Compliance Audit Trail)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    active_role_id VARCHAR(32) NOT NULL,
    action_code VARCHAR(64) NOT NULL,
    target_entity_type VARCHAR(64) NOT NULL,
    target_entity_id UUID NOT NULL,
    previous_state JSONB DEFAULT NULL,
    new_state JSONB DEFAULT NULL,
    justification TEXT DEFAULT NULL,
    client_ip VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    correlation_id UUID NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_academic_events_entity ON academic_events(entity_type, entity_id);
CREATE INDEX idx_academic_events_actor ON academic_events(actor_user_id);
CREATE INDEX idx_notification_messages_event ON notification_messages(event_id);
CREATE INDEX idx_notification_deliveries_recipient ON notification_deliveries(recipient_user_id, delivery_status);
CREATE INDEX idx_notification_deliveries_message ON notification_deliveries(message_id);
CREATE INDEX idx_audit_events_target ON audit_events(target_entity_type, target_entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp_utc DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action_code);
