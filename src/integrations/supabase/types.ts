export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addon_purchases: {
        Row: {
          addon_type: string
          amount_cents: number | null
          applied_at: string | null
          business_id: string | null
          created_at: string
          currency: string | null
          environment: string
          expires_at: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          addon_type: string
          amount_cents?: number | null
          applied_at?: string | null
          business_id?: string | null
          created_at?: string
          currency?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          addon_type?: string
          amount_cents?: number | null
          applied_at?: string | null
          business_id?: string | null
          created_at?: string
          currency?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_coupons: {
        Row: {
          addon_type: string
          code: string
          created_at: string
          created_by: string
          discount_kind: string
          discount_value: number | null
          expires_at: string | null
          id: string
          last_redeemed_at: string | null
          max_uses: number | null
          notes: string | null
          promoter_id: string | null
          redeemed_at: string | null
          redeemed_by_business: string | null
          redeemed_by_user: string | null
          status: string
          uses_count: number
        }
        Insert: {
          addon_type: string
          code: string
          created_at?: string
          created_by: string
          discount_kind?: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          last_redeemed_at?: string | null
          max_uses?: number | null
          notes?: string | null
          promoter_id?: string | null
          redeemed_at?: string | null
          redeemed_by_business?: string | null
          redeemed_by_user?: string | null
          status?: string
          uses_count?: number
        }
        Update: {
          addon_type?: string
          code?: string
          created_at?: string
          created_by?: string
          discount_kind?: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          last_redeemed_at?: string | null
          max_uses?: number | null
          notes?: string | null
          promoter_id?: string | null
          redeemed_at?: string | null
          redeemed_by_business?: string | null
          redeemed_by_user?: string | null
          status?: string
          uses_count?: number
        }
        Relationships: []
      }
      booking_clicks: {
        Row: {
          business_id: string
          clicked_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          clicked_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          clicked_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      business_claims: {
        Row: {
          business_id: string
          claimant_email: string
          claimant_id: string
          claimant_phone: string | null
          claimant_role: string | null
          created_at: string
          id: string
          proof_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          business_id: string
          claimant_email: string
          claimant_id: string
          claimant_phone?: string | null
          claimant_role?: string | null
          created_at?: string
          id?: string
          proof_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          claimant_email?: string
          claimant_id?: string
          claimant_phone?: string | null
          claimant_role?: string | null
          created_at?: string
          id?: string
          proof_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      business_features: {
        Row: {
          business_id: string
          created_at: string
          feature_id: string
          is_highlighted: boolean
        }
        Insert: {
          business_id: string
          created_at?: string
          feature_id: string
          is_highlighted?: boolean
        }
        Update: {
          business_id?: string
          created_at?: string
          feature_id?: string
          is_highlighted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      business_follows: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          business_id: string
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          business_id: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          business_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_business_id: string | null
          referred_claim_id: string | null
          referrer_business_id: string
          reward_granted_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_business_id?: string | null
          referred_claim_id?: string | null
          referrer_business_id: string
          reward_granted_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_business_id?: string | null
          referred_claim_id?: string | null
          referrer_business_id?: string
          reward_granted_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_referrals_referred_business_id_fkey"
            columns: ["referred_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_referrals_referred_claim_id_fkey"
            columns: ["referred_claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_referrals_referrer_business_id_fkey"
            columns: ["referrer_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_verification_requests: {
        Row: {
          address: string | null
          admin_notes: string | null
          business_id: string | null
          business_name: string
          business_type: string
          city: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          document_paths: string[]
          id: string
          legal_name: string | null
          postal_code: string | null
          province: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_number: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          business_id?: string | null
          business_name: string
          business_type: string
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          document_paths?: string[]
          id?: string
          legal_name?: string | null
          postal_code?: string | null
          province?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_number?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          business_id?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          document_paths?: string[]
          id?: string
          legal_name?: string | null
          postal_code?: string | null
          province?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      business_views: {
        Row: {
          business_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          business_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          business_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          booking_label: string | null
          booking_url: string | null
          bumped_until: string | null
          business_type: string | null
          category_id: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          extra_tags_until: string | null
          featured_highlights_until: string | null
          featured_until: string | null
          hero_image_url: string | null
          hours: Json | null
          id: string
          import_confidence: number | null
          is_claimed: boolean
          keywords: string[] | null
          latitude: number | null
          longitude: number | null
          name: string
          ordering_links: Json
          owner_id: string | null
          phone: string | null
          phone_normalized: string | null
          photo_pack_bonus: number
          postal_code: string | null
          price_tier: number | null
          province: string | null
          referral_code: string | null
          slug: string
          source: string | null
          source_ref: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string
          website: string | null
          website_host: string | null
        }
        Insert: {
          address?: string | null
          booking_label?: string | null
          booking_url?: string | null
          bumped_until?: string | null
          business_type?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          extra_tags_until?: string | null
          featured_highlights_until?: string | null
          featured_until?: string | null
          hero_image_url?: string | null
          hours?: Json | null
          id?: string
          import_confidence?: number | null
          is_claimed?: boolean
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name: string
          ordering_links?: Json
          owner_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          photo_pack_bonus?: number
          postal_code?: string | null
          price_tier?: number | null
          province?: string | null
          referral_code?: string | null
          slug: string
          source?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
          website?: string | null
          website_host?: string | null
        }
        Update: {
          address?: string | null
          booking_label?: string | null
          booking_url?: string | null
          bumped_until?: string | null
          business_type?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          extra_tags_until?: string | null
          featured_highlights_until?: string | null
          featured_until?: string | null
          hero_image_url?: string | null
          hours?: Json | null
          id?: string
          import_confidence?: number | null
          is_claimed?: boolean
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          ordering_links?: Json
          owner_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          photo_pack_bonus?: number
          postal_code?: string | null
          price_tier?: number | null
          province?: string | null
          referral_code?: string | null
          slug?: string
          source?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
          website?: string | null
          website_host?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          addon_type: string
          code: string
          commission_cents: number
          commission_paid_at: string | null
          commission_payout_ref: string | null
          commission_status: string
          coupon_id: string
          id: string
          promoter_id: string | null
          redeemed_at: string
          redeemed_by_business: string | null
          redeemed_by_user: string
        }
        Insert: {
          addon_type: string
          code: string
          commission_cents?: number
          commission_paid_at?: string | null
          commission_payout_ref?: string | null
          commission_status?: string
          coupon_id: string
          id?: string
          promoter_id?: string | null
          redeemed_at?: string
          redeemed_by_business?: string | null
          redeemed_by_user: string
        }
        Update: {
          addon_type?: string
          code?: string
          commission_cents?: number
          commission_paid_at?: string | null
          commission_payout_ref?: string | null
          commission_status?: string
          coupon_id?: string
          id?: string
          promoter_id?: string | null
          redeemed_at?: string
          redeemed_by_business?: string | null
          redeemed_by_user?: string
        }
        Relationships: []
      }
      dealer_subscriptions: {
        Row: {
          billing_interval: string
          boost_credits_remaining: number
          business_id: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          notes: string | null
          plan_id: string
          status: Database["public"]["Enums"]["dealer_subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          boost_credits_remaining?: number
          business_id: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["dealer_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          boost_credits_remaining?: number
          business_id?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["dealer_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          customer_last_read_at: string | null
          id: string
          last_message_at: string | null
          owner_last_read_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          customer_last_read_at?: string | null
          id?: string
          last_message_at?: string | null
          owner_last_read_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          customer_last_read_at?: string | null
          id?: string
          last_message_at?: string | null
          owner_last_read_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      features: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      import_sources: {
        Row: {
          category_slug: string | null
          city: string
          created_at: string
          enabled: boolean
          id: string
          last_imported_count: number | null
          last_run_at: string | null
          osm_filter: string | null
          province: string
          query: string | null
          source: string
        }
        Insert: {
          category_slug?: string | null
          city: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_imported_count?: number | null
          last_run_at?: string | null
          osm_filter?: string | null
          province: string
          query?: string | null
          source: string
        }
        Update: {
          category_slug?: string | null
          city?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_imported_count?: number | null
          last_run_at?: string | null
          osm_filter?: string | null
          province?: string
          query?: string | null
          source?: string
        }
        Relationships: []
      }
      imported_businesses: {
        Row: {
          address: string | null
          ai_description: string | null
          category_id: string | null
          category_slug: string | null
          city: string | null
          confidence: number | null
          created_at: string
          dedup_match_business_id: string | null
          dedup_reason: string | null
          email: string | null
          hours: Json | null
          id: string
          keywords: string[] | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          phone_normalized: string | null
          postal_code: string | null
          promoted_business_id: string | null
          province: string | null
          raw: Json
          social_links: Json | null
          source: string
          source_ref: string
          status: string
          updated_at: string
          website: string | null
          website_host: string | null
        }
        Insert: {
          address?: string | null
          ai_description?: string | null
          category_id?: string | null
          category_slug?: string | null
          city?: string | null
          confidence?: number | null
          created_at?: string
          dedup_match_business_id?: string | null
          dedup_reason?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          postal_code?: string | null
          promoted_business_id?: string | null
          province?: string | null
          raw: Json
          social_links?: Json | null
          source: string
          source_ref: string
          status?: string
          updated_at?: string
          website?: string | null
          website_host?: string | null
        }
        Update: {
          address?: string | null
          ai_description?: string | null
          category_id?: string | null
          category_slug?: string | null
          city?: string | null
          confidence?: number | null
          created_at?: string
          dedup_match_business_id?: string | null
          dedup_reason?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          postal_code?: string | null
          promoted_business_id?: string | null
          province?: string | null
          raw?: Json
          social_links?: Json | null
          source?: string
          source_ref?: string
          status?: string
          updated_at?: string
          website?: string | null
          website_host?: string | null
        }
        Relationships: []
      }
      listing_card_clicks: {
        Row: {
          business_id: string
          clicked_at: string
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          clicked_at?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          clicked_at?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      listing_promotions: {
        Row: {
          business_id: string | null
          created_at: string
          currency: string
          ends_at: string | null
          granted_by: string | null
          id: string
          kind: Database["public"]["Enums"]["promotion_kind"]
          notes: string | null
          owner_user_id: string | null
          price_cents: number
          source: string
          starts_at: string
          status: Database["public"]["Enums"]["promotion_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["promotion_target"]
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          currency?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["promotion_kind"]
          notes?: string | null
          owner_user_id?: string | null
          price_cents?: number
          source?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["promotion_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["promotion_target"]
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          currency?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["promotion_kind"]
          notes?: string | null
          owner_user_id?: string | null
          price_cents?: number
          source?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["promotion_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["promotion_target"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      marketplace_disputes: {
        Row: {
          created_at: string
          details: string | null
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listing_photos: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          boost_score: number
          boosted_until: string | null
          category_id: string | null
          city: string | null
          commission_cents: number | null
          compare_at_price_cents: number | null
          condition: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          description: string | null
          featured_until: string | null
          id: string
          is_boosted: boolean
          is_featured: boolean
          latitude: number | null
          listing_type: string
          longitude: number | null
          postal_code: string | null
          price_cents: number
          province: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          boost_score?: number
          boosted_until?: string | null
          category_id?: string | null
          city?: string | null
          commission_cents?: number | null
          compare_at_price_cents?: number | null
          condition?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          is_boosted?: boolean
          is_featured?: boolean
          latitude?: number | null
          listing_type?: string
          longitude?: number | null
          postal_code?: string | null
          price_cents?: number
          province?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          boost_score?: number
          boosted_until?: string | null
          category_id?: string | null
          city?: string | null
          commission_cents?: number | null
          compare_at_price_cents?: number | null
          condition?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          is_boosted?: boolean
          is_featured?: boolean
          latitude?: number | null
          listing_type?: string
          longitude?: number | null
          postal_code?: string | null
          price_cents?: number
          province?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_items: {
        Row: {
          commission_cents: number
          created_at: string
          id: string
          image_path: string | null
          listing_id: string
          order_id: string
          payout_id: string | null
          quantity: number
          seller_id: string
          title: string
          unit_price_cents: number
        }
        Insert: {
          commission_cents?: number
          created_at?: string
          id?: string
          image_path?: string | null
          listing_id: string
          order_id: string
          payout_id?: string | null
          quantity?: number
          seller_id: string
          title: string
          unit_price_cents: number
        }
        Update: {
          commission_cents?: number
          created_at?: string
          id?: string
          image_path?: string | null
          listing_id?: string
          order_id?: string
          payout_id?: string | null
          quantity?: number
          seller_id?: string
          title?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "marketplace_seller_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_confirmed_at: string | null
          buyer_id: string
          commission_cents: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          environment: string
          fulfilled_at: string | null
          fulfillment: string
          id: string
          notes: string | null
          paid_at: string | null
          promoter_code: string | null
          promoter_id: string | null
          released_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_confirmed_at?: string | null
          buyer_id: string
          commission_cents?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          environment?: string
          fulfilled_at?: string | null
          fulfillment?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          promoter_code?: string | null
          promoter_id?: string | null
          released_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_confirmed_at?: string | null
          buyer_id?: string
          commission_cents?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          environment?: string
          fulfilled_at?: string | null
          fulfillment?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          promoter_code?: string | null
          promoter_id?: string | null
          released_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_seller_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string
          currency: string
          id: string
          item_count: number
          method: string | null
          notes: string | null
          paid_at: string
          reference: string | null
          seller_id: string
          status: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          item_count?: number
          method?: string | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          item_count?: number
          method?: string | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: []
      }
      mp_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "mp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_threads: {
        Row: {
          buyer_id: string
          buyer_last_read_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string
          seller_id: string
          seller_last_read_at: string | null
        }
        Insert: {
          buyer_id: string
          buyer_last_read_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id: string
          seller_id: string
          seller_last_read_at?: string | null
        }
        Update: {
          buyer_id?: string
          buyer_last_read_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string
          seller_id?: string
          seller_last_read_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promoters: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_number: string | null
          commission_type: string
          commission_value: number
          company_name: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          notes: string | null
          payout_details: string | null
          payout_method: string | null
          phone: string | null
          pitch: string | null
          social_handle: string | null
          status: string
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_number?: string | null
          commission_type?: string
          commission_value?: number
          company_name?: string | null
          created_at?: string
          display_name: string
          email: string
          id?: string
          notes?: string | null
          payout_details?: string | null
          payout_method?: string | null
          phone?: string | null
          pitch?: string | null
          social_handle?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_number?: string | null
          commission_type?: string
          commission_value?: number
          company_name?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          notes?: string | null
          payout_details?: string | null
          payout_method?: string | null
          phone?: string | null
          pitch?: string | null
          social_handle?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      review_likes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          created_at: string
          id: string
          review_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          business_id: string
          created_at: string
          id: string
          owner_reply: string | null
          owner_reply_at: string | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          id?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          id?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          category_slug: string | null
          city: string | null
          created_at: string
          id: string
          label: string
          query: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_slug?: string | null
          city?: string | null
          created_at?: string
          id?: string
          label: string
          query?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_slug?: string | null
          city?: string | null
          created_at?: string
          id?: string
          label?: string
          query?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          category_slug: string | null
          city: string | null
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          category_slug?: string | null
          city?: string | null
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          category_slug?: string | null
          city?: string | null
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      specials: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          discount_label: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          discount_label?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          discount_label?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          analytics_access: boolean
          api_access: boolean
          boost_credits_monthly: number
          created_at: string
          currency: string
          custom_branding: boolean
          description: string | null
          featured_slots: number
          id: string
          inventory_limit: number | null
          is_active: boolean
          lead_management: boolean
          monthly_price_cents: number
          name: string
          priority_support: boolean
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          tier: Database["public"]["Enums"]["dealer_plan_tier"]
          updated_at: string
          yearly_price_cents: number
        }
        Insert: {
          analytics_access?: boolean
          api_access?: boolean
          boost_credits_monthly?: number
          created_at?: string
          currency?: string
          custom_branding?: boolean
          description?: string | null
          featured_slots?: number
          id?: string
          inventory_limit?: number | null
          is_active?: boolean
          lead_management?: boolean
          monthly_price_cents?: number
          name: string
          priority_support?: boolean
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier: Database["public"]["Enums"]["dealer_plan_tier"]
          updated_at?: string
          yearly_price_cents?: number
        }
        Update: {
          analytics_access?: boolean
          api_access?: boolean
          boost_credits_monthly?: number
          created_at?: string
          currency?: string
          custom_branding?: boolean
          description?: string | null
          featured_slots?: number
          id?: string
          inventory_limit?: number | null
          is_active?: boolean
          lead_management?: boolean
          monthly_price_cents?: number
          name?: string
          priority_support?: boolean
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier?: Database["public"]["Enums"]["dealer_plan_tier"]
          updated_at?: string
          yearly_price_cents?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      user_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_leads: {
        Row: {
          admin_notes: string | null
          ai_estimate_high_cents: number | null
          ai_estimate_low_cents: number | null
          ai_notes: string | null
          asking_price_cents: number | null
          city: string | null
          condition: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          lead_type: Database["public"]["Enums"]["vehicle_lead_type"]
          make: string | null
          message: string | null
          mileage_km: number | null
          model: string | null
          phone: string | null
          preferred_date: string | null
          preferred_time: string | null
          province: string | null
          status: Database["public"]["Enums"]["vehicle_lead_status"]
          trim: string | null
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          admin_notes?: string | null
          ai_estimate_high_cents?: number | null
          ai_estimate_low_cents?: number | null
          ai_notes?: string | null
          asking_price_cents?: number | null
          city?: string | null
          condition?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          lead_type: Database["public"]["Enums"]["vehicle_lead_type"]
          make?: string | null
          message?: string | null
          mileage_km?: number | null
          model?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["vehicle_lead_status"]
          trim?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          admin_notes?: string | null
          ai_estimate_high_cents?: number | null
          ai_estimate_low_cents?: number | null
          ai_notes?: string | null
          asking_price_cents?: number | null
          city?: string | null
          condition?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          lead_type?: Database["public"]["Enums"]["vehicle_lead_type"]
          make?: string | null
          message?: string | null
          mileage_km?: number | null
          model?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["vehicle_lead_status"]
          trim?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_leads_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_photos: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          storage_path: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: string | null
          boost_score: number
          boosted_until: string | null
          city: string | null
          condition: string | null
          created_at: string
          currency: string
          dealer_business_id: string | null
          description: string | null
          drivetrain: string | null
          engine: string | null
          exterior_color: string | null
          featured_until: string | null
          features: string[] | null
          fuel_type: string | null
          id: string
          is_boosted: boolean
          is_featured: boolean
          make: string | null
          mileage_km: number | null
          model: string | null
          postal_code: string | null
          price_cents: number
          province: string | null
          seller_id: string
          seller_type: string
          status: string
          title: string
          transmission: string | null
          trim: string | null
          updated_at: string
          view_count: number
          vin: string | null
          year: number | null
        }
        Insert: {
          body_type?: string | null
          boost_score?: number
          boosted_until?: string | null
          city?: string | null
          condition?: string | null
          created_at?: string
          currency?: string
          dealer_business_id?: string | null
          description?: string | null
          drivetrain?: string | null
          engine?: string | null
          exterior_color?: string | null
          featured_until?: string | null
          features?: string[] | null
          fuel_type?: string | null
          id?: string
          is_boosted?: boolean
          is_featured?: boolean
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          postal_code?: string | null
          price_cents?: number
          province?: string | null
          seller_id: string
          seller_type?: string
          status?: string
          title: string
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          view_count?: number
          vin?: string | null
          year?: number | null
        }
        Update: {
          body_type?: string | null
          boost_score?: number
          boosted_until?: string | null
          city?: string | null
          condition?: string | null
          created_at?: string
          currency?: string
          dealer_business_id?: string | null
          description?: string | null
          drivetrain?: string | null
          engine?: string | null
          exterior_color?: string | null
          featured_until?: string | null
          features?: string[] | null
          fuel_type?: string | null
          id?: string
          is_boosted?: boolean
          is_featured?: boolean
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          postal_code?: string | null
          price_cents?: number
          province?: string | null
          seller_id?: string
          seller_type?: string
          status?: string
          title?: string
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          view_count?: number
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_dealer_business_id_fkey"
            columns: ["dealer_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_active_price_id: {
        Args: { check_env?: string; user_uuid: string }
        Returns: string
      }
      get_listing_contact: {
        Args: { _listing_id: string }
        Returns: {
          contact_email: string
          contact_phone: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mp_thread_participant: {
        Args: { _thread_id: string }
        Returns: boolean
      }
      is_thread_participant: { Args: { _thread_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "business_owner" | "customer" | "owner"
      business_status: "pending" | "approved" | "rejected"
      dealer_plan_tier: "starter" | "professional" | "premium"
      dealer_subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "inactive"
      promotion_kind: "featured" | "boosted"
      promotion_status: "pending" | "active" | "expired" | "canceled"
      promotion_target: "marketplace_listing" | "vehicle"
      vehicle_lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "closed_won"
        | "closed_lost"
      vehicle_lead_type: "test_drive" | "trade_in" | "cash_offer" | "contact"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "business_owner", "customer", "owner"],
      business_status: ["pending", "approved", "rejected"],
      dealer_plan_tier: ["starter", "professional", "premium"],
      dealer_subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "inactive",
      ],
      promotion_kind: ["featured", "boosted"],
      promotion_status: ["pending", "active", "expired", "canceled"],
      promotion_target: ["marketplace_listing", "vehicle"],
      vehicle_lead_status: [
        "new",
        "contacted",
        "qualified",
        "closed_won",
        "closed_lost",
      ],
      vehicle_lead_type: ["test_drive", "trade_in", "cash_offer", "contact"],
    },
  },
} as const
