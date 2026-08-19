-- CreateTable
CREATE TABLE "APIIntegration" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "auth_key_env_var" TEXT,
    "auth_type" TEXT,
    "base_url" TEXT,
    "cost_level" TEXT,
    "documentation_url" TEXT,
    "endpoints" TEXT,
    "last_tested_at" TIMESTAMP(3),
    "name" TEXT,
    "notes" TEXT,
    "provider" TEXT,
    "rate_limits" TEXT,
    "status" TEXT,

    CONSTRAINT "APIIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionProposal" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "decision_id" TEXT,
    "description" TEXT,
    "executed_at" TIMESTAMP(3),
    "expected_outputs" TEXT,
    "inputs" TEXT,
    "proposal_type" TEXT,
    "proposed_at" TIMESTAMP(3),
    "proposed_by_id" TEXT,
    "related_approval_id" TEXT,
    "status" TEXT,
    "tool_executions_required" TEXT,
    "venture_id" TEXT,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "ActionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT,
    "actor" TEXT,
    "after_state" TEXT,
    "app_build_id" TEXT,
    "before_state" TEXT,
    "details" TEXT,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "event_type" TEXT,
    "notes" TEXT,
    "project_id" TEXT,
    "severity" TEXT,
    "summary" TEXT,
    "timestamp" TIMESTAMP(3),

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBuild" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_config_json" TEXT,
    "agent_type" TEXT,
    "audience" TEXT,
    "boundaries" TEXT,
    "deployment_url" TEXT,
    "embed_code" TEXT,
    "failure_reason" TEXT,
    "knowledge_base_urls" TEXT[],
    "memory_enabled" BOOLEAN,
    "name" TEXT,
    "personality" TEXT,
    "project_id" TEXT,
    "purpose" TEXT,
    "status" TEXT,
    "system_prompt" TEXT,
    "test_questions" TEXT,
    "test_results" TEXT,
    "tools_enabled" TEXT[],
    "version" DOUBLE PRECISION,

    CONSTRAINT "AgentBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDailyLife" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "creative_thoughts" TEXT,
    "date" TIMESTAMP(3),
    "mood_evolution" TEXT,
    "notes" TEXT,
    "things_actually_said" TEXT,
    "things_considered_saying_but_didnt" TEXT,
    "things_observed" TEXT,

    CONSTRAINT "AgentDailyLife_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFeedback" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "created_at" TIMESTAMP(3),
    "feedback" TEXT,
    "james_comment" TEXT,
    "learning_extracted" TEXT,
    "message_id" TEXT,

    CONSTRAINT "AgentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFleet" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_build_id" TEXT,
    "agent_name" TEXT,
    "agent_role" TEXT,
    "assigned_app_id" TEXT,
    "assigned_platform" TEXT,
    "auto_approve" BOOLEAN,
    "error_count" DOUBLE PRECISION,
    "last_result" TEXT,
    "last_run_at" TIMESTAMP(3),
    "notes" TEXT,
    "performance_score" DOUBLE PRECISION,
    "schedule" TEXT,
    "status" TEXT,
    "total_actions_taken" DOUBLE PRECISION,
    "total_revenue_attributed" DOUBLE PRECISION,

    CONSTRAINT "AgentFleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentGatewayCredential" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "agent_identity_id" TEXT,
    "allowed_actions" TEXT[],
    "expires_at" TIMESTAMP(3),
    "gateway_policy_id" TEXT,
    "immutable" BOOLEAN,
    "issued_at" TIMESTAMP(3),
    "source_app_id" TEXT,
    "token_hash" TEXT,

    CONSTRAINT "AgentGatewayCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInitiatedMessage" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "dry_run" BOOLEAN,
    "feedback_at" TIMESTAMP(3),
    "feedback_received" TEXT,
    "message_body" TEXT,
    "message_type" TEXT,
    "notes" TEXT,
    "proposed_delivery_channel" TEXT,
    "quality_reasoning" TEXT,
    "quality_score" DOUBLE PRECISION,
    "quiet_hours_override_reason" TEXT,
    "quiet_hours_override_requested" BOOLEAN,
    "sent_at" TIMESTAMP(3),
    "status" TEXT,
    "subject_line" TEXT,
    "urgency" TEXT,

    CONSTRAINT "AgentInitiatedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInitiationBudget" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "can_break_quiet_hours" BOOLEAN,
    "daily_budget" DOUBLE PRECISION,
    "dry_run_mode" BOOLEAN,
    "last_reset_at" TIMESTAMP(3),
    "notes" TEXT,
    "total_negative_feedback" DOUBLE PRECISION,
    "total_positive_feedback" DOUBLE PRECISION,
    "total_sent_lifetime" DOUBLE PRECISION,
    "used_today" DOUBLE PRECISION,

    CONSTRAINT "AgentInitiationBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInnerState" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "current_concerns" TEXT,
    "current_focus" TEXT,
    "current_mood" TEXT,
    "current_opportunities_noticed" TEXT,
    "inner_monologue" TEXT,
    "last_heartbeat_at" TIMESTAMP(3),
    "last_meaningful_interaction_summary" TEXT,
    "notes" TEXT,
    "relationship_temperature_with_james" TEXT,

    CONSTRAINT "AgentInnerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "correlation_id" TEXT,
    "creation_channel" TEXT,
    "delivery_hash" TEXT,
    "delivery_status" TEXT,
    "from_agent_id" TEXT,
    "from_agent_name" TEXT,
    "is_read" BOOLEAN,
    "message_type" TEXT,
    "metadata" TEXT,
    "project_id" TEXT,
    "requires_response" BOOLEAN,
    "source_app_id" TEXT,
    "source_content_hash" TEXT,
    "source_event_id" TEXT,
    "task_id" TEXT,
    "to_agent_id" TEXT,
    "to_agent_name" TEXT,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTaskJournal" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_id" TEXT,
    "agent_name" TEXT,
    "assumptions" TEXT,
    "completed_at" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "errors" TEXT,
    "execution_time_ms" DOUBLE PRECISION,
    "follow_up_actions" TEXT,
    "lessons_learned" TEXT,
    "outputs" TEXT,
    "project_id" TEXT,
    "report_id" TEXT,
    "reusable_patterns" TEXT,
    "sources_used" TEXT,
    "started_at" TIMESTAMP(3),
    "status" TEXT,
    "task_id" TEXT,
    "task_summary" TEXT,

    CONSTRAINT "AgentTaskJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppBlueprint" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_name" TEXT,
    "app_purpose" TEXT,
    "app_type" TEXT,
    "backend_functions_summary" TEXT,
    "build_phases" TEXT,
    "complexity_score" DOUBLE PRECISION,
    "core_features" TEXT,
    "current_phase" TEXT,
    "demo_data_plan" TEXT,
    "entities_summary" TEXT,
    "navigation_structure" TEXT,
    "notes" TEXT,
    "pages_summary" TEXT,
    "problem_statement" TEXT,
    "project_id" TEXT,
    "qa_plan" TEXT,
    "status" TEXT,
    "target_users" TEXT,
    "user_roles" TEXT,

    CONSTRAINT "AppBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppBuild" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_name" TEXT,
    "blueprint_id" TEXT,
    "build_phase" TEXT,
    "current_scope" TEXT,
    "deployment_status" TEXT,
    "entities_created" TEXT,
    "entities_planned" TEXT,
    "existing_app_context" TEXT,
    "functions_created" TEXT,
    "functions_planned" TEXT,
    "known_errors" TEXT,
    "last_builder_prompt" TEXT,
    "last_builder_response" TEXT,
    "next_prompt" TEXT,
    "notes" TEXT,
    "pages_created" TEXT,
    "pages_planned" TEXT,
    "project_id" TEXT,
    "qa_score" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "AppBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRegistry" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "app_id" TEXT,
    "app_name" TEXT,
    "app_url" TEXT,
    "health_status" TEXT,
    "known_entities" TEXT[],
    "known_functions" TEXT[],
    "known_pages" TEXT[],
    "last_scanned_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "AppRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approver_id" TEXT,
    "decision" TEXT,
    "decision_reason" TEXT,
    "estimated_cost" DOUBLE PRECISION,
    "expiry" TIMESTAMP(3),
    "external_side_effects" TEXT,
    "is_acceptance_test" BOOLEAN,
    "permissions_requested" TEXT,
    "request_type" TEXT,
    "requested_action" TEXT,
    "requested_at" TIMESTAMP(3),
    "requested_by_id" TEXT,
    "risk_level" TEXT,
    "scope" TEXT,
    "target_entity_id" TEXT,
    "target_entity_type" TEXT,
    "venture_id" TEXT,
    "version_hash" TEXT,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "artifact_type" TEXT,
    "content" TEXT,
    "content_hash" TEXT,
    "external_deployment_url" TEXT,
    "generated_at" TIMESTAMP(3),
    "generated_by" TEXT,
    "is_generated_in_app" BOOLEAN,
    "name" TEXT,
    "path" TEXT,
    "status" TEXT,
    "venture_id" TEXT,
    "verification_evidence" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" TEXT,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "brief_id" TEXT,
    "classification" TEXT,
    "confidence" DOUBLE PRECISION,
    "rationale" TEXT,
    "statement" TEXT,
    "status" TEXT,
    "supporting_evidence_ids" TEXT,
    "validated_at" TIMESTAMP(3),
    "validated_by_id" TEXT,
    "venture_id" TEXT,

    CONSTRAINT "Assumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildChain" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_id" TEXT,
    "auto_deploy" BOOLEAN,
    "auto_outreach" BOOLEAN,
    "auto_test" BOOLEAN,
    "blueprint_id" TEXT,
    "builder_prompts" TEXT[],
    "completed_at" TIMESTAMP(3),
    "current_step" DOUBLE PRECISION,
    "deployment_url" TEXT,
    "duration_minutes" DOUBLE PRECISION,
    "error_log" TEXT,
    "name" TEXT,
    "notes" TEXT,
    "project_id" TEXT,
    "started_at" TIMESTAMP(3),
    "status" TEXT,
    "test_results" TEXT,
    "total_steps" DOUBLE PRECISION,

    CONSTRAINT "BuildChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildPlan" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "blueprint" TEXT,
    "build_artifacts" TEXT,
    "build_phases" TEXT,
    "deployment_approved_at" TIMESTAMP(3),
    "deployment_approved_by" TEXT,
    "deployment_status" TEXT,
    "deployment_url" TEXT,
    "error_log" TEXT,
    "project_id" TEXT,
    "qa_report" TEXT,
    "qa_score" DOUBLE PRECISION,
    "status" TEXT,
    "tech_stack" TEXT,

    CONSTRAINT "BuildPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildReport" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "assets_generated" TEXT,
    "audit_results" TEXT,
    "bugs_fixed" TEXT,
    "bugs_found" TEXT,
    "build_summary" TEXT,
    "features_built" TEXT,
    "final_e2e_result" TEXT,
    "known_limitations" TEXT,
    "market_ready_status" TEXT,
    "project_id" TEXT,
    "provider_status" TEXT,
    "recommended_next_steps" TEXT,
    "report_title" TEXT,
    "tests_run" TEXT,

    CONSTRAINT "BuildReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildSimulation" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "base44_compatibility_score" DOUBLE PRECISION,
    "commercial_value_score" DOUBLE PRECISION,
    "founder_intent_id" TEXT,
    "mode" TEXT,
    "riley_pick" BOOLEAN,
    "riley_recommendation" TEXT,
    "risk_score" DOUBLE PRECISION,
    "speed_score" DOUBLE PRECISION,
    "summary" TEXT,
    "technical_debt_score" DOUBLE PRECISION,
    "user_value_score" DOUBLE PRECISION,

    CONSTRAINT "BuildSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderPrompt" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_build_id" TEXT,
    "builder_response" TEXT,
    "copy_ready" BOOLEAN,
    "created_files" TEXT,
    "expected_result" TEXT,
    "issues_created" TEXT,
    "next_prompt" TEXT,
    "notes" TEXT,
    "phase" TEXT,
    "project_id" TEXT,
    "prompt_body" TEXT,
    "prompt_title" TEXT,
    "purpose" TEXT,
    "status" TEXT,

    CONSTRAINT "BuilderPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "asset_ids" TEXT[],
    "audience" TEXT,
    "campaign_type" TEXT,
    "channels" TEXT[],
    "core_message" TEXT,
    "end_date" TIMESTAMP(3),
    "landing_page_id" TEXT,
    "metrics" TEXT,
    "name" TEXT,
    "project_id" TEXT,
    "start_date" TIMESTAMP(3),
    "status" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveRun" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "final_output" TEXT,
    "input_prompt" TEXT,
    "meta_cognition_result" TEXT,
    "models_used" TEXT[],
    "pipeline_steps" TEXT,
    "project_id" TEXT,
    "quality_score" DOUBLE PRECISION,
    "run_name" TEXT,
    "status" TEXT,
    "task_type" TEXT,
    "total_duration_ms" DOUBLE PRECISION,
    "total_estimated_cost" DOUBLE PRECISION,
    "total_tokens" DOUBLE PRECISION,

    CONSTRAINT "CognitiveRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProfile" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "funding" TEXT,
    "last_scanned_at" TIMESTAMP(3),
    "name" TEXT,
    "notes" TEXT,
    "opportunity" TEXT,
    "pricing" TEXT,
    "products" TEXT,
    "status" TEXT,
    "strengths" TEXT,
    "team_size" TEXT,
    "tech_stack" TEXT,
    "threat_level" TEXT,
    "weaknesses" TEXT,
    "website" TEXT,

    CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentLibrary" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "brand_compliant" BOOLEAN,
    "category" TEXT,
    "code_snippet" TEXT,
    "dependencies" TEXT[],
    "description" TEXT,
    "name" TEXT,
    "preview_description" TEXT,
    "props" TEXT,
    "tags" TEXT[],
    "tailwind_classes" TEXT,
    "used_in_apps" TEXT[],
    "version" DOUBLE PRECISION,

    CONSTRAINT "ComponentLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsensusSession" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "duration_ms" DOUBLE PRECISION,
    "models_queried" TEXT[],
    "project_id" TEXT,
    "prompt" TEXT,
    "responses" TEXT,
    "session_name" TEXT,
    "status" TEXT,
    "synthesis" TEXT,
    "task_type" TEXT,
    "winning_model" TEXT,

    CONSTRAINT "ConsensusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT,
    "content_type" TEXT,
    "keywords" TEXT[],
    "language" TEXT,
    "meta_description" TEXT,
    "meta_title" TEXT,
    "project_id" TEXT,
    "prompt" TEXT,
    "readability_score" DOUBLE PRECISION,
    "seo_score" DOUBLE PRECISION,
    "status" TEXT,
    "tags" TEXT[],
    "target_audience" TEXT,
    "title" TEXT,
    "tone" TEXT,
    "version" DOUBLE PRECISION,
    "word_count" DOUBLE PRECISION,

    CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContinuityConfig" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "config_key" TEXT,
    "conscience_dry_run" BOOLEAN,
    "notes" TEXT,

    CONSTRAINT "ContinuityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContradictionLog" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "claim_a" TEXT,
    "claim_b" TEXT,
    "confidence_in_resolution" DOUBLE PRECISION,
    "contradiction_type" TEXT,
    "project_id" TEXT,
    "resolution" TEXT,
    "resolved_by" TEXT,
    "source_a" TEXT,
    "source_b" TEXT,
    "timestamp" TIMESTAMP(3),

    CONSTRAINT "ContradictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "credit_type" TEXT,
    "duration_ms" DOUBLE PRECISION,
    "estimated_cost" DOUBLE PRECISION,
    "function_name" TEXT,
    "model" TEXT,
    "notes" TEXT,
    "provider" TEXT,
    "session_id" TEXT,
    "timestamp" TIMESTAMP(3),
    "tokens_used" DOUBLE PRECISION,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrystalBasket" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "is_demo" BOOLEAN,
    "item_count" DOUBLE PRECISION,
    "items" TEXT,
    "status" TEXT,
    "total_amount" DOUBLE PRECISION,

    CONSTRAINT "CrystalBasket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrystalCustomer" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "email" TEXT,
    "is_demo" BOOLEAN,
    "name" TEXT,
    "notes" TEXT,
    "phone" TEXT,
    "tier" TEXT,
    "total_orders" DOUBLE PRECISION,
    "total_spent" DOUBLE PRECISION,

    CONSTRAINT "CrystalCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrystalFulfilment" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "carrier" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "delivered_at" TIMESTAMP(3),
    "is_demo" BOOLEAN,
    "notes" TEXT,
    "order_id" TEXT,
    "shipped_at" TIMESTAMP(3),
    "status" TEXT,
    "tracking_number" TEXT,

    CONSTRAINT "CrystalFulfilment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrystalMessage" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT,
    "content" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "direction" TEXT,
    "is_demo" BOOLEAN,
    "sent_at" TIMESTAMP(3),
    "status" TEXT,
    "subject" TEXT,

    CONSTRAINT "CrystalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrystalOrder" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "basket_id" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "fulfilment_status" TEXT,
    "is_demo" BOOLEAN,
    "order_date" TIMESTAMP(3),
    "payment_status" TEXT,
    "status" TEXT,
    "total_amount" DOUBLE PRECISION,

    CONSTRAINT "CrystalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrystalProduct" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "crystal_type" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "is_demo" BOOLEAN,
    "metaphysical_properties" TEXT,
    "name" TEXT,
    "origin" TEXT,
    "price" DOUBLE PRECISION,
    "sku" TEXT,
    "stock_quantity" DOUBLE PRECISION,

    CONSTRAINT "CrystalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebugIssue" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "affected_component" TEXT,
    "affected_function" TEXT,
    "affected_page" TEXT,
    "app_build_id" TEXT,
    "error_message" TEXT,
    "fix_prompt" TEXT,
    "notes" TEXT,
    "project_id" TEXT,
    "regression_risk" TEXT,
    "retest_result" TEXT,
    "status" TEXT,
    "suspected_cause" TEXT,
    "title" TEXT,

    CONSTRAINT "DebugIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "conditions" TEXT,
    "confidence" DOUBLE PRECISION,
    "decision_type" TEXT,
    "rationale" TEXT,
    "related_approval_request_id" TEXT,
    "related_proposal_id" TEXT,
    "status" TEXT,
    "venture_id" TEXT,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionMatrix" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "criteria" TEXT,
    "decided_option" TEXT,
    "notes" TEXT,
    "options" TEXT,
    "project_id" TEXT,
    "recommendation" TEXT,
    "scores" TEXT,
    "status" TEXT,
    "title" TEXT,

    CONSTRAINT "DecisionMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergenceLedger" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "future_recommendation" TEXT,
    "linked_patch_plan_id" TEXT,
    "linked_project_id" TEXT,
    "reusable_pattern" TEXT,
    "riley_learned" TEXT,
    "session_date" TIMESTAMP(3),
    "what_failed" TEXT,
    "what_worked" TEXT,

    CONSTRAINT "EmergenceLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "criteria" TEXT,
    "evaluated_at" TIMESTAMP(3),
    "evaluated_by_id" TEXT,
    "evaluation_type" TEXT,
    "evidence_ids" TEXT,
    "limitations" TEXT,
    "results" TEXT,
    "score" DOUBLE PRECISION,
    "venture_id" TEXT,
    "verdict" TEXT,
    "workflow_run_id" TEXT,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "archived_snapshot_reference" TEXT,
    "brief_id" TEXT,
    "claim_supported" TEXT,
    "classification" TEXT,
    "confidence" DOUBLE PRECISION,
    "content_hash" TEXT,
    "document_reference" TEXT,
    "excerpt_or_summary" TEXT,
    "publication_date" TIMESTAMP(3),
    "publisher" TEXT,
    "reliability_rating" DOUBLE PRECISION,
    "retrieved_at" TIMESTAMP(3),
    "source_title" TEXT,
    "source_type" TEXT,
    "source_url" TEXT,
    "status" TEXT,
    "venture_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForgeAgent" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_type" TEXT,
    "capabilities" TEXT,
    "config" TEXT,
    "description" TEXT,
    "execution_count" DOUBLE PRECISION,
    "last_execution" TIMESTAMP(3),
    "name" TEXT,
    "project_id" TEXT,
    "status" TEXT,
    "success_rate" DOUBLE PRECISION,
    "system_prompt" TEXT,
    "tools" TEXT,

    CONSTRAINT "ForgeAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForgeMembership" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "forge_role" TEXT,
    "granted_at" TIMESTAMP(3),
    "granted_by_id" TEXT,
    "permissions" TEXT,
    "status" TEXT,
    "user_email" TEXT,
    "user_id" TEXT,
    "venture_id" TEXT,

    CONSTRAINT "ForgeMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "admin_notes" TEXT,
    "charity_donated_to" TEXT,
    "consent_given" BOOLEAN,
    "donation_amount" TEXT,
    "download_asset_id" TEXT,
    "download_sent" BOOLEAN,
    "email" TEXT,
    "landing_page_id" TEXT,
    "message" TEXT,
    "name" TEXT,
    "project_id" TEXT,
    "status" TEXT,
    "submission_type" TEXT,
    "uploaded_file_url" TEXT,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FortressLayerStatus" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_id" TEXT,
    "connected_to" DOUBLE PRECISION[],
    "coverage_percent" DOUBLE PRECISION,
    "deployment_method" TEXT,
    "docker_compose_path" TEXT,
    "evidence_url" TEXT,
    "last_health_check" TIMESTAMP(3),
    "layer_name" TEXT,
    "layer_number" DOUBLE PRECISION,
    "notes" TEXT,
    "owner" TEXT,
    "ring" TEXT,
    "status" TEXT,
    "tool_deployed" TEXT,

    CONSTRAINT "FortressLayerStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderIntent" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN,
    "business_goal" TEXT,
    "confidence" DOUBLE PRECISION,
    "conversation_id" TEXT,
    "interpreted_request" TEXT,
    "raw_request" TEXT,
    "real_want" TEXT,
    "recommended_build_mode" TEXT,
    "risk_level" TEXT,
    "technical_goal" TEXT,
    "ux_goal" TEXT,

    CONSTRAINT "FounderIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceGig" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "build_chain_id" TEXT,
    "client_email" TEXT,
    "client_name" TEXT,
    "cost_estimate" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "deliverables" TEXT,
    "description" TEXT,
    "hours_actual" DOUBLE PRECISION,
    "hours_estimated" DOUBLE PRECISION,
    "notes" TEXT,
    "platform" TEXT,
    "price" DOUBLE PRECISION,
    "profit_margin" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "status" TEXT,
    "stripe_invoice_id" TEXT,
    "title" TEXT,

    CONSTRAINT "FreelanceGig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedAsset" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" TEXT,
    "approval_notes" TEXT,
    "asset_type" TEXT,
    "brand_applied" BOOLEAN,
    "caption" TEXT,
    "created_by_prompt" TEXT,
    "dimensions" TEXT,
    "download_count" DOUBLE PRECISION,
    "duration_seconds" DOUBLE PRECISION,
    "failure_reason" TEXT,
    "file_url" TEXT,
    "format" TEXT,
    "model" TEXT,
    "name" TEXT,
    "negative_prompt" TEXT,
    "parent_asset_id" TEXT,
    "preview_url" TEXT,
    "project_id" TEXT,
    "prompt" TEXT,
    "provider" TEXT,
    "public_url" TEXT,
    "render_metadata" TEXT,
    "source_data" TEXT,
    "status" TEXT,
    "tags" TEXT[],
    "thumbnail_url" TEXT,
    "version" DOUBLE PRECISION,

    CONSTRAINT "GeneratedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthCampaign" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_id" TEXT,
    "app_name" TEXT,
    "assigned_agent" TEXT,
    "budget" DOUBLE PRECISION,
    "campaign_type" TEXT,
    "channel" TEXT,
    "clicks" DOUBLE PRECISION,
    "conversions" DOUBLE PRECISION,
    "impressions" DOUBLE PRECISION,
    "is_demo" BOOLEAN,
    "roi" DOUBLE PRECISION,
    "spend" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "GrowthCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPAsset" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "commercial_value" TEXT,
    "created_date_actual" TIMESTAMP(3),
    "description" TEXT,
    "documentation_url" TEXT,
    "licensable" BOOLEAN,
    "license_price" DOUBLE PRECISION,
    "license_type" TEXT,
    "licensed_to" TEXT[],
    "name" TEXT,
    "notes" TEXT,
    "origin" TEXT,
    "protection_status" TEXT,
    "related_project_id" TEXT,
    "type" TEXT,

    CONSTRAINT "IPAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentLog" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_id" TEXT,
    "auto_blocked" BOOLEAN,
    "escalated_to" TEXT,
    "incident_type" TEXT,
    "layer_detected" DOUBLE PRECISION,
    "notes" TEXT,
    "severity" TEXT,
    "source_ip" TEXT,
    "status" TEXT,
    "target_resource" TEXT,
    "timestamp" TIMESTAMP(3),
    "wazuh_event_id" TEXT,

    CONSTRAINT "IncidentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationJob" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT,
    "api_integration_id" TEXT,
    "cost" DOUBLE PRECISION,
    "duration_ms" DOUBLE PRECISION,
    "error_message" TEXT,
    "integration_name" TEXT,
    "project_id" TEXT,
    "request_payload" TEXT,
    "response_payload" TEXT,
    "retry_count" DOUBLE PRECISION,
    "status" TEXT,
    "timestamp" TIMESTAMP(3),

    CONSTRAINT "IntegrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceReport" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "action_items" TEXT,
    "auto_generated" BOOLEAN,
    "full_report" TEXT,
    "james_read" BOOLEAN,
    "related_competitor" TEXT,
    "related_project_id" TEXT,
    "relevance_score" DOUBLE PRECISION,
    "report_type" TEXT,
    "sources" TEXT[],
    "summary" TEXT,
    "tags" TEXT[],
    "title" TEXT,
    "urgency" TEXT,

    CONSTRAINT "IntelligenceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteractionLog" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "contact_id" TEXT,
    "deal_pipeline_id" TEXT,
    "follow_up_action" TEXT,
    "follow_up_by" TIMESTAMP(3),
    "follow_up_needed" BOOLEAN,
    "interaction_type" TEXT,
    "notes" TEXT,
    "outreach_draft_id" TEXT,
    "sentiment" TEXT,
    "summary" TEXT,
    "timestamp" TIMESTAMP(3),

    CONSTRAINT "InteractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "content" TEXT,
    "dedup_hash" TEXT,
    "is_pinned" BOOLEAN,
    "project_id" TEXT,
    "relevance_score" DOUBLE PRECISION,
    "source" TEXT,
    "source_journal_id" TEXT,
    "source_project_id" TEXT,
    "source_report_id" TEXT,
    "tags" TEXT,
    "title" TEXT,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "analytics_enabled" BOOLEAN,
    "body_sections" TEXT,
    "custom_css" TEXT,
    "download_asset_id" TEXT,
    "failure_reason" TEXT,
    "form_enabled" BOOLEAN,
    "form_schema" TEXT,
    "generated_css" TEXT,
    "generated_html" TEXT,
    "generated_js" TEXT,
    "hero_headline" TEXT,
    "hero_subheadline" TEXT,
    "last_publish_result" TEXT,
    "page_type" TEXT,
    "preview_url" TEXT,
    "primary_cta_label" TEXT,
    "primary_cta_url" TEXT,
    "project_id" TEXT,
    "published_url" TEXT,
    "secondary_cta_label" TEXT,
    "secondary_cta_url" TEXT,
    "seo_description" TEXT,
    "seo_title" TEXT,
    "slug" TEXT,
    "social_image_url" TEXT,
    "status" TEXT,
    "title" TEXT,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProposal" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "classification" TEXT,
    "confidence" DOUBLE PRECISION,
    "content" TEXT,
    "evaluation_id" TEXT,
    "status" TEXT,
    "supporting_evidence_ids" TEXT,
    "title" TEXT,
    "validated_at" TIMESTAMP(3),
    "validated_by_id" TEXT,
    "venture_id" TEXT,

    CONSTRAINT "LearningProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseAgreement" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "auto_renew" BOOLEAN,
    "contract_url" TEXT,
    "end_date" TIMESTAMP(3),
    "ip_asset_id" TEXT,
    "license_type" TEXT,
    "licensee_email" TEXT,
    "licensee_name" TEXT,
    "notes" TEXT,
    "payment_frequency" TEXT,
    "price" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3),
    "status" TEXT,
    "stripe_subscription_id" TEXT,
    "terms" TEXT,

    CONSTRAINT "LicenseAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSaleClaim" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "customer_id" TEXT,
    "customer_name" TEXT,
    "is_demo" BOOLEAN,
    "notes" TEXT,
    "product_id" TEXT,
    "product_name" TEXT,
    "product_price" DOUBLE PRECISION,
    "sale_event" TEXT,
    "status" TEXT,

    CONSTRAINT "LiveSaleClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalModelProvider" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "capability_tags" TEXT[],
    "connection_status" TEXT,
    "context_window" DOUBLE PRECISION,
    "cost_level" TEXT,
    "endpoint_url" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "last_test_result" TEXT,
    "limitations" TEXT,
    "model_name" TEXT,
    "notes" TEXT,
    "privacy_level" TEXT,
    "provider_name" TEXT,
    "runtime" TEXT,
    "setup_notes" TEXT,
    "test_prompt" TEXT,
    "use_cases" TEXT,

    CONSTRAINT "LocalModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" TEXT,
    "brand_applied" BOOLEAN,
    "caption" TEXT,
    "dimensions" TEXT,
    "file_url" TEXT,
    "format" TEXT,
    "language" TEXT,
    "media_type" TEXT,
    "name" TEXT,
    "project_id" TEXT,
    "prompt" TEXT,
    "status" TEXT,
    "tags" TEXT[],

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeshConversation" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "depth" TEXT,
    "duration_ms" DOUBLE PRECISION,
    "estimated_cost_usd" DOUBLE PRECISION,
    "linked_entity_id" TEXT,
    "linked_entity_type" TEXT,
    "mesh_query_id" TEXT,
    "question" TEXT,
    "requesting_agent" TEXT,
    "requesting_user" TEXT,
    "siblings_consulted" TEXT[],
    "status" TEXT,
    "synthesis_received" TEXT,
    "timestamp" TIMESTAMP(3),

    CONSTRAINT "MeshConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeshInbox" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "context_url" TEXT,
    "correlation_id" TEXT,
    "delivered_at" TIMESTAMP(3),
    "delivery_attempted_at" TIMESTAMP(3),
    "delivery_error" TEXT,
    "delivery_method" TEXT,
    "from_agent" TEXT,
    "from_app_id" TEXT,
    "message_body" TEXT,
    "metadata" TEXT,
    "priority" TEXT,
    "read_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "reply_body" TEXT,
    "requires_reply" BOOLEAN,
    "status" TEXT,
    "subject" TEXT,
    "to_agent" TEXT,
    "transmission_id" TEXT,

    CONSTRAINT "MeshInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeshNode" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "agent_role" TEXT,
    "app_id" TEXT,
    "app_url" TEXT,
    "average_quality_score" DOUBLE PRECISION,
    "average_response_time_ms" DOUBLE PRECISION,
    "bridge_function_name" TEXT,
    "cost_per_query_estimate_usd" DOUBLE PRECISION,
    "dispatch_mode" TEXT,
    "endpoint_type" TEXT,
    "last_heartbeat" TIMESTAMP(3),
    "last_query_at" TIMESTAMP(3),
    "model_count" DOUBLE PRECISION,
    "notes" TEXT,
    "personality_prompt" TEXT,
    "priority_weight" DOUBLE PRECISION,
    "specialties" TEXT[],
    "status" TEXT,
    "system_context" TEXT,
    "total_mesh_queries" DOUBLE PRECISION,

    CONSTRAINT "MeshNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeshQuery" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_responses" TEXT,
    "agents_consulted" TEXT[],
    "agents_failed" TEXT[],
    "agents_planned" TEXT[],
    "confidence" DOUBLE PRECISION,
    "contradictions_detected" TEXT,
    "depth" TEXT,
    "duration_ms" DOUBLE PRECISION,
    "error_message" TEXT,
    "estimated_cost_usd" DOUBLE PRECISION,
    "original_question" TEXT,
    "project_id" TEXT,
    "query_name" TEXT,
    "requesting_agent" TEXT,
    "requesting_user" TEXT,
    "status" TEXT,
    "synthesis" TEXT,
    "synthesis_method" TEXT,
    "tags" TEXT[],
    "total_agents_consulted" DOUBLE PRECISION,
    "total_models_fired" DOUBLE PRECISION,

    CONSTRAINT "MeshQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeshSibling" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_name" TEXT,
    "agent_role" TEXT,
    "colour_hex" TEXT,
    "emoji" TEXT,
    "home_app_id" TEXT,
    "home_app_name" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "personality_summary" TEXT,
    "priority_weight" DOUBLE PRECISION,
    "specialties" TEXT[],
    "status" TEXT,

    CONSTRAINT "MeshSibling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroApp" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "ad_spend" DOUBLE PRECISION,
    "api_costs" DOUBLE PRECISION,
    "assigned_agent" TEXT,
    "days_live" DOUBLE PRECISION,
    "description" TEXT,
    "is_demo" BOOLEAN,
    "keyword" TEXT,
    "kill_reason" TEXT,
    "mrr" DOUBLE PRECISION,
    "name" TEXT,
    "niche" TEXT,
    "profitability_threshold_met" BOOLEAN,
    "repo_url" TEXT,
    "status" TEXT,
    "subscribers" DOUBLE PRECISION,
    "url" TEXT,

    CONSTRAINT "MicroApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelBenchmark" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "estimated_cost_usd" DOUBLE PRECISION,
    "model_name" TEXT,
    "notes" TEXT,
    "prompt_used" TEXT,
    "provider" TEXT,
    "quality_score" DOUBLE PRECISION,
    "response_text" TEXT,
    "speed_ms" DOUBLE PRECISION,
    "task_type" TEXT,
    "tested_at" TIMESTAMP(3),
    "token_count" DOUBLE PRECISION,

    CONSTRAINT "ModelBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelRegistry" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "api_endpoint" TEXT,
    "api_key_env_var" TEXT,
    "api_model_string" TEXT,
    "average_quality_score" DOUBLE PRECISION,
    "best_for" TEXT[],
    "context_window" DOUBLE PRECISION,
    "cost_per_1k_input" DOUBLE PRECISION,
    "cost_per_1k_output" DOUBLE PRECISION,
    "display_name" TEXT,
    "enabled" BOOLEAN,
    "last_tested_at" TIMESTAMP(3),
    "max_output_tokens" DOUBLE PRECISION,
    "model_id" TEXT,
    "notes" TEXT,
    "provider" TEXT,
    "quality_tier" TEXT,
    "speed_tier" TEXT,
    "strengths" TEXT[],
    "weaknesses" TEXT[],

    CONSTRAINT "ModelRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NicheOpportunity" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" TEXT,
    "competition_score" DOUBLE PRECISION,
    "description" TEXT,
    "is_demo" BOOLEAN,
    "keyword" TEXT,
    "keyword_value" TEXT,
    "opportunity_score" DOUBLE PRECISION,
    "search_volume" DOUBLE PRECISION,
    "source" TEXT,
    "source_url" TEXT,
    "status" TEXT,
    "title" TEXT,

    CONSTRAINT "NicheOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenSourceResource" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "cost_level" TEXT,
    "description" TEXT,
    "github_url" TEXT,
    "integration_type" TEXT,
    "license" TEXT,
    "name" TEXT,
    "risk_notes" TEXT,
    "setup_notes" TEXT,
    "status" TEXT,
    "use_case" TEXT,
    "website_url" TEXT,

    CONSTRAINT "OpenSourceResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityRegister" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "action_required" TEXT,
    "assigned_to" TEXT,
    "deadline" TIMESTAMP(3),
    "description" TEXT,
    "discovered_by" TEXT,
    "effort_required" TEXT,
    "estimated_value" TEXT,
    "notes" TEXT,
    "probability" DOUBLE PRECISION,
    "related_project_id" TEXT,
    "source_url" TEXT,
    "status" TEXT,
    "title" TEXT,
    "type" TEXT,

    CONSTRAINT "OpportunityRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeEvent" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "evidence_id" TEXT,
    "is_simulated" BOOLEAN,
    "outcome_type" TEXT,
    "recorded_at" TIMESTAMP(3),
    "recorded_by_id" TEXT,
    "tool_execution_id" TEXT,
    "venture_id" TEXT,
    "workflow_run_id" TEXT,

    CONSTRAINT "OutcomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatchPlan" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "affected_entities" TEXT[],
    "affected_files" TEXT[],
    "affected_functions" TEXT[],
    "affected_routes" TEXT[],
    "approved" BOOLEAN,
    "build_objective" TEXT,
    "founder_intent_id" TEXT,
    "implementation_order" TEXT,
    "requires_approval" BOOLEAN,
    "risks" TEXT,
    "rollback_plan" TEXT,
    "status" TEXT,
    "testing_plan" TEXT,

    CONSTRAINT "PatchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionPolicy" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "action_type" TEXT,
    "allowed" BOOLEAN,
    "approval_role" TEXT,
    "conditions" TEXT,
    "description" TEXT,
    "forge_role" TEXT,
    "max_cost" DOUBLE PRECISION,
    "policy_name" TEXT,
    "requires_approval" BOOLEAN,

    CONSTRAINT "PermissionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchPlan" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "customer_pitch" TEXT,
    "founder_benefit" TEXT,
    "founder_intent_id" TEXT,
    "investor_pitch" TEXT,
    "market_relevance" TEXT,
    "one_liner" TEXT,
    "partner_pitch" TEXT,
    "user_benefit" TEXT,
    "why_this_matters" TEXT,

    CONSTRAINT "PitchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "conversion_rate" DOUBLE PRECISION,
    "features" TEXT,
    "limits" TEXT,
    "notes" TEXT,
    "price_annual" DOUBLE PRECISION,
    "price_monthly" DOUBLE PRECISION,
    "product_name" TEXT,
    "stripe_price_id" TEXT,
    "target_audience" TEXT,
    "tier_name" TEXT,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "brand_colors" TEXT[],
    "brand_voice" TEXT,
    "category" TEXT,
    "competitors" TEXT,
    "cover_image" TEXT,
    "deployment_url" TEXT,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "market_size_sam" TEXT,
    "market_size_som" TEXT,
    "market_size_tam" TEXT,
    "name" TEXT,
    "notes" TEXT,
    "priority" TEXT,
    "problem_statement" TEXT,
    "progress" DOUBLE PRECISION,
    "revenue_model" TEXT,
    "seo_keywords" TEXT[],
    "solution_summary" TEXT,
    "status" TEXT,
    "swot_analysis" TEXT,
    "tags" TEXT,
    "target_audience" TEXT,
    "target_languages" TEXT[],
    "team_members" TEXT[],
    "tech_stack" TEXT,
    "validation_score" DOUBLE PRECISION,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectGenome" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "components" TEXT[],
    "design_patterns" TEXT,
    "entities" TEXT[],
    "functions" TEXT[],
    "last_scanned_at" TIMESTAMP(3),
    "pages" TEXT[],
    "project_id" TEXT,
    "revenue_paths" TEXT,
    "risk_zones" TEXT,
    "routes" TEXT[],
    "strategic_opportunities" TEXT,
    "technical_debt" TEXT,
    "user_journeys" TEXT,

    CONSTRAINT "ProjectGenome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "assigned_agent" TEXT,
    "completion_notes" TEXT,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "phase" TEXT,
    "priority" TEXT,
    "project_id" TEXT,
    "status" TEXT,
    "title" TEXT,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "average_quality_score" DOUBLE PRECISION,
    "last_used_at" TIMESTAMP(3),
    "model_target" TEXT,
    "name" TEXT,
    "notes" TEXT,
    "prompt_text" TEXT,
    "task_type" TEXT,
    "times_used" DOUBLE PRECISION,
    "variables" TEXT[],
    "version" DOUBLE PRECISION,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAReview" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "accessibility_status" TEXT,
    "app_build_id" TEXT,
    "backend_status" TEXT,
    "demo_data_status" TEXT,
    "entity_status" TEXT,
    "final_score" DOUBLE PRECISION,
    "form_validation_status" TEXT,
    "frontend_status" TEXT,
    "navigation_status" TEXT,
    "notes" TEXT,
    "performance_status" TEXT,
    "project_id" TEXT,
    "recommendations" TEXT,
    "security_status" TEXT,
    "title" TEXT,
    "unresolved_issues" TEXT,

    CONSTRAINT "QAReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityAudit" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "agent_build_id" TEXT,
    "asset_id" TEXT,
    "audit_type" TEXT,
    "auditor_notes" TEXT,
    "bugs_fixed" TEXT,
    "bugs_found" TEXT,
    "findings" TEXT,
    "landing_page_id" TEXT,
    "name" TEXT,
    "project_id" TEXT,
    "retest_results" TEXT,
    "score" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "QualityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuietHoursConfig" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "applies_to_agents" TEXT[],
    "config_name" TEXT,
    "end_time_aest" TEXT,
    "notes" TEXT,
    "overridable_for_big_opportunities" BOOLEAN,
    "overridable_for_emergencies" BOOLEAN,
    "overridable_for_urgent" BOOLEAN,
    "respect_if_james_online" BOOLEAN,
    "start_time_aest" TEXT,

    CONSTRAINT "QuietHoursConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReasoningChain" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "duration_ms" DOUBLE PRECISION,
    "final_answer" TEXT,
    "model_used" TEXT,
    "notes" TEXT,
    "original_question" TEXT,
    "project_id" TEXT,
    "quality_score" DOUBLE PRECISION,
    "steps" TEXT,
    "title" TEXT,
    "total_steps" DOUBLE PRECISION,

    CONSTRAINT "ReasoningChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipContact" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "company" TEXT,
    "deal_pipeline_ids" TEXT[],
    "email" TEXT,
    "first_contact_date" TIMESTAMP(3),
    "follow_up_frequency" TEXT,
    "interests" TEXT[],
    "investor_target_id" TEXT,
    "last_contact_date" TIMESTAMP(3),
    "linkedin_url" TEXT,
    "name" TEXT,
    "next_follow_up" TIMESTAMP(3),
    "notes" TEXT,
    "phone" TEXT,
    "relationship_type" TEXT,
    "role" TEXT,
    "tags" TEXT[],
    "total_interactions" DOUBLE PRECISION,
    "warmth" TEXT,

    CONSTRAINT "RelationshipContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemediationReport" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "changes_completed" TEXT,
    "contradictions_repaired" TEXT,
    "entities_created" TEXT,
    "final_verdict" TEXT,
    "future_items" TEXT,
    "known_limitations" TEXT,
    "qa_results" TEXT,
    "records_migrated" TEXT,
    "report_date" TIMESTAMP(3),
    "title" TEXT,

    CONSTRAINT "RemediationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "audit_notes" TEXT,
    "audit_result" TEXT,
    "completed_at" TIMESTAMP(3),
    "debug_notes" TEXT,
    "duration_ms" DOUBLE PRECISION,
    "error_message" TEXT,
    "generated_asset_id" TEXT,
    "job_name" TEXT,
    "job_type" TEXT,
    "max_retries" DOUBLE PRECISION,
    "model" TEXT,
    "normalized_prompt" TEXT,
    "progress_percent" DOUBLE PRECISION,
    "project_id" TEXT,
    "provider" TEXT,
    "provider_job_id" TEXT,
    "request_payload" TEXT,
    "response_payload" TEXT,
    "retry_count" DOUBLE PRECISION,
    "started_at" TIMESTAMP(3),
    "status" TEXT,

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueStream" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "acquisition_cost" DOUBLE PRECISION,
    "annual_projection" DOUBLE PRECISION,
    "app_id" TEXT,
    "churn_rate" DOUBLE PRECISION,
    "customer_count" DOUBLE PRECISION,
    "lifetime_value" DOUBLE PRECISION,
    "margin_percent" DOUBLE PRECISION,
    "monthly_actual" DOUBLE PRECISION,
    "monthly_target" DOUBLE PRECISION,
    "name" TEXT,
    "notes" TEXT,
    "pricing_model" TEXT,
    "product" TEXT,
    "status" TEXT,
    "stripe_product_id" TEXT,
    "type" TEXT,

    CONSTRAINT "RevenueStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RileyInnerState" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "concerns" TEXT,
    "focus" TEXT,
    "generated_by_model" TEXT,
    "heartbeat_count" DOUBLE PRECISION,
    "inner_monologue" TEXT,
    "last_conversation_echo" TEXT,
    "mood" TEXT,
    "triggered_by" TEXT,

    CONSTRAINT "RileyInnerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RileyJournal" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "for_james" BOOLEAN,
    "mood" TEXT,
    "public" BOOLEAN,
    "title" TEXT,
    "trigger" TEXT,

    CONSTRAINT "RileyJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RileyMemory" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "archive_reason" TEXT,
    "category" TEXT,
    "confidence" DOUBLE PRECISION,
    "content" TEXT,
    "last_used_at" TIMESTAMP(3),
    "linked_project_id" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "title" TEXT,

    CONSTRAINT "RileyMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RileyProject" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_url" TEXT,
    "base44_app_url" TEXT,
    "brand" TEXT,
    "brand_voice" TEXT,
    "business_model" TEXT,
    "core_offer" TEXT,
    "description" TEXT,
    "name" TEXT,
    "next_actions" TEXT,
    "notes" TEXT,
    "priority" TEXT,
    "project_type" TEXT,
    "repository_url" TEXT,
    "risks" TEXT,
    "stage" TEXT,
    "status" TEXT,
    "target_audience" TEXT,

    CONSTRAINT "RileyProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeConflictReview" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_build_id" TEXT,
    "approved_by_james" BOOLEAN,
    "conflict_level" TEXT,
    "conflict_summary" TEXT,
    "current_app_context" TEXT,
    "notes" TEXT,
    "overwrite_risk" TEXT,
    "project_id" TEXT,
    "recommendation" TEXT,
    "requested_change" TEXT,
    "safe_build_path" TEXT,

    CONSTRAINT "ScopeConflictReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditResult" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_id" TEXT,
    "app_name" TEXT,
    "audit_date" TIMESTAMP(3),
    "fix_prompts_generated" TEXT[],
    "overall_score" DOUBLE PRECISION,
    "owasp_checks" TEXT,
    "recommendations" TEXT,
    "severity_summary" TEXT,
    "status" TEXT,
    "vulnerabilities_found" TEXT,

    CONSTRAINT "SecurityAuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityPosture" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "app_id" TEXT,
    "app_name" TEXT,
    "auto_block_enabled" BOOLEAN,
    "compliance_grade" TEXT,
    "last_audit_at" TIMESTAMP(3),
    "last_incident_at" TIMESTAMP(3),
    "layers_active" DOUBLE PRECISION,
    "layers_critical_gap" TEXT[],
    "layers_total" DOUBLE PRECISION,
    "notes" TEXT,
    "overall_score" DOUBLE PRECISION,
    "ring" TEXT,
    "threat_intel_status" TEXT,

    CONSTRAINT "SecurityPosture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfImprovementRule" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "category" TEXT,
    "confidence" DOUBLE PRECISION,
    "rule" TEXT,
    "source" TEXT,
    "title" TEXT,
    "trigger" TEXT,

    CONSTRAINT "SelfImprovementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_james" BOOLEAN,
    "auto_generated" BOOLEAN,
    "campaign_id" TEXT,
    "content" TEXT,
    "engagement" TEXT,
    "hashtags" TEXT[],
    "media_urls" TEXT[],
    "notes" TEXT,
    "platform" TEXT,
    "posted_at" TIMESTAMP(3),
    "project_id" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "status" TEXT,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoulCoreEntry" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN,
    "category" TEXT,
    "content" TEXT,
    "immutable" BOOLEAN,
    "last_mutated_at" TIMESTAMP(3),
    "mutation_history" TEXT,
    "notes" TEXT,
    "title" TEXT,
    "version" DOUBLE PRECISION,

    CONSTRAINT "SoulCoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "assignee" TEXT,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "labels" TEXT[],
    "priority" TEXT,
    "project_id" TEXT,
    "status" TEXT,
    "task_type" TEXT,
    "title" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechRadarItem" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "action_taken" TEXT,
    "category" TEXT,
    "cost" TEXT,
    "description" TEXT,
    "discovered_at" TIMESTAMP(3),
    "integration_effort" TEXT,
    "maturity" TEXT,
    "name" TEXT,
    "notes" TEXT,
    "potential_impact" TEXT,
    "relevance_to_hermetica" TEXT,
    "ring" TEXT,
    "url" TEXT,

    CONSTRAINT "TechRadarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "description" TEXT,
    "is_default" BOOLEAN,
    "name" TEXT,
    "prompt_template" TEXT,
    "tone" TEXT,
    "variables" TEXT[],

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelFeed" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "applied_to_apps" TEXT[],
    "auto_block_status" TEXT,
    "confidence" DOUBLE PRECISION,
    "feed_source" TEXT,
    "first_seen" TIMESTAMP(3),
    "ioc_type" TEXT,
    "ioc_value" TEXT,
    "last_seen" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ThreatIntelFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolExecution" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "api_cost" DOUBLE PRECISION,
    "completed_at" TIMESTAMP(3),
    "duration_ms" DOUBLE PRECISION,
    "error_message" TEXT,
    "inputs" TEXT,
    "is_connected_tool" BOOLEAN,
    "outputs" TEXT,
    "permissions_used" TEXT,
    "started_at" TIMESTAMP(3),
    "status" TEXT,
    "token_cost" DOUBLE PRECISION,
    "tool_name" TEXT,
    "tool_type" TEXT,
    "venture_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" TEXT,
    "workflow_run_id" TEXT,

    CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "content_piece_id" TEXT,
    "original_text" TEXT,
    "project_id" TEXT,
    "quality_score" DOUBLE PRECISION,
    "source_language" TEXT,
    "status" TEXT,
    "target_language" TEXT,
    "translated_text" TEXT,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "role" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationReport" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "competition_score" DOUBLE PRECISION,
    "drive_archive_status" TEXT,
    "drive_archived_at" TIMESTAMP(3),
    "drive_error" TEXT,
    "drive_file_id" TEXT,
    "drive_file_url" TEXT,
    "feasibility_score" DOUBLE PRECISION,
    "full_report" TEXT,
    "market_score" DOUBLE PRECISION,
    "opportunities" TEXT,
    "overall_score" DOUBLE PRECISION,
    "project_id" TEXT,
    "recommendations" TEXT,
    "report_type" TEXT,
    "revenue_score" DOUBLE PRECISION,
    "risks" TEXT,
    "status" TEXT,
    "summary" TEXT,
    "swot_quadrants" TEXT,

    CONSTRAINT "ValidationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "assigned_builder_id" TEXT,
    "assigned_reviewer_id" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "description" TEXT,
    "execution_mode" TEXT,
    "founder_id" TEXT,
    "is_acceptance_test" BOOLEAN,
    "is_legacy_demo" BOOLEAN,
    "lifecycle_stage" TEXT,
    "name" TEXT,
    "parent_venture_id" TEXT,
    "status" TEXT,
    "tags" TEXT,
    "truth_disclosure" TEXT,
    "venture_type" TEXT,

    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureBrief" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "constraints" TEXT,
    "content_hash" TEXT,
    "problem_statement" TEXT,
    "proposed_solution" TEXT,
    "revenue_model_hypothesis" TEXT,
    "status" TEXT,
    "success_criteria" TEXT,
    "target_audience" TEXT,
    "venture_id" TEXT,
    "version" TEXT,

    CONSTRAINT "VentureBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureFinancial" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "ad_spend" DOUBLE PRECISION,
    "api_costs" DOUBLE PRECISION,
    "app_id" TEXT,
    "app_name" TEXT,
    "assigned_agent" TEXT,
    "decision" TEXT,
    "decision_reason" TEXT,
    "hosting_costs" DOUBLE PRECISION,
    "is_demo" BOOLEAN,
    "net_profit" DOUBLE PRECISION,
    "record_date" TIMESTAMP(3),
    "revenue" DOUBLE PRECISION,
    "subscribers" DOUBLE PRECISION,

    CONSTRAINT "VentureFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_by" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "api_cost" DOUBLE PRECISION,
    "completed_at" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "current_step" TEXT,
    "duration_ms" DOUBLE PRECISION,
    "error_log" TEXT,
    "execution_mode" TEXT,
    "initiated_by_id" TEXT,
    "is_acceptance_test" BOOLEAN,
    "started_at" TIMESTAMP(3),
    "status" TEXT,
    "steps" TEXT,
    "token_cost" DOUBLE PRECISION,
    "venture_id" TEXT,
    "verification_evidence" TEXT,
    "workflow_type" TEXT,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_otp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");
