with ord_all as (
    SELECT biz,
        sub_biz,
        sub_biz_detail,
        item_id,
        item_name,
        pay_date,
        mid,
        order_amount,
        if_item_new,
        if_mid_new
    FROM xx.dws_sqzz_item_mid_date_ifnew_a_d
    where log_date = '20251014'
),
date_all as (
    select distinct pay_date as event_date
    from ord_all
)
select t1.biz,
    t1.sub_biz_detail,
    t0.event_date,
    t1.item_id,
    max(t1.if_item_new) as if_item_weekly_new
from date_all t0
    left join (
        select biz,
case
                when sub_biz_detail in ('装扮直购', '装扮搭售') then '装扮套装'
                else sub_biz_detail
            end as sub_biz_detail,
            item_id,
            pay_date,
            max(if_item_new) as if_item_new
        from ord_all
        group by 1,
            2,
            3,
            4
    ) t1 on t1.pay_date between date_sub(t0.event_date, 6) and t0.event_date
group by 1,
    2,
    3,
    4