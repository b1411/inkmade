-- 0039: индексы на внешние ключи (perf-advisor unindexed_foreign_keys, 23 шт).
-- FK без индекса заставляют Postgres делать seq scan при проверке ссылочной целостности
-- (каскады, удаления родителя) и при join'ах/фильтрах по этим колонкам. Индексы безопасны:
-- только ускоряют, не меняют поведение. IF NOT EXISTS — миграция идемпотентна.

create index if not exists idx_admin_audit_log_actor_id on public.admin_audit_log (actor_id);
create index if not exists idx_designer_invitations_invited_by on public.designer_invitations (invited_by);
create index if not exists idx_designer_profiles_invited_by on public.designer_profiles (invited_by);
create index if not exists idx_designs_variant_id on public.designs (variant_id);
create index if not exists idx_favorites_print_id on public.favorites (print_id);
create index if not exists idx_favorites_product_id on public.favorites (product_id);
create index if not exists idx_finance_entries_designer_id on public.finance_entries (designer_id);
create index if not exists idx_finance_entries_order_id on public.finance_entries (order_id);
create index if not exists idx_order_evidence_actor_id on public.order_evidence (actor_id);
create index if not exists idx_order_items_design_id on public.order_items (design_id);
create index if not exists idx_order_items_print_id on public.order_items (print_id);
create index if not exists idx_order_items_print_owner_id on public.order_items (print_owner_id);
create index if not exists idx_order_items_variant_id on public.order_items (variant_id);
create index if not exists idx_order_status_log_actor_id on public.order_status_log (actor_id);
create index if not exists idx_payouts_processed_by on public.payouts (processed_by);
create index if not exists idx_print_library_owner_id on public.print_library (owner_id);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_royalty_earnings_order_item_id on public.royalty_earnings (order_item_id);
create index if not exists idx_royalty_earnings_payout_id on public.royalty_earnings (payout_id);
create index if not exists idx_royalty_earnings_print_id on public.royalty_earnings (print_id);
create index if not exists idx_royalty_rate_history_changed_by on public.royalty_rate_history (changed_by);
create index if not exists idx_stock_movements_actor_id on public.stock_movements (actor_id);
create index if not exists idx_stock_movements_order_id on public.stock_movements (order_id);
