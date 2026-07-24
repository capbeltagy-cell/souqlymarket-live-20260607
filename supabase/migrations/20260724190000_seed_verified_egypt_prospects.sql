-- Starter batch of Egyptian business prospects collected from each company's public official website.
-- These are business contact details, not personal contacts. Keep is_published=false until reviewed.

insert into public.company_prospects
(name_ar, name_en, industry, governorate, city, industrial_zone, website, email, phone, whatsapp, description, source_name, source_url, contact_status, is_published, data_quality_score)
select * from (values
  ('الشركة الوطنية للمواسير', 'National Pipe Company', 'مواسير خرسانية وبنية تحتية', 'القاهرة', 'مدينة بدر', 'المنطقة الصناعية الخامسة', 'https://www.npc.com.eg', 'info@npc.com.eg', '+20228605072', '+201207099919', 'مصنع مواسير خرسانية سابقة الصب ومواسير مياه وصرف.', 'Official website', 'https://www.npc.com.eg/contactus.html', 'not_contacted', false, 95),
  ('تكامل للصناعات الهندسية', 'TAKAMOL Engineering Industries', 'صناعات هندسية', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية جنوب غرب 6A', 'https://www.takamol.com.eg', 'info@takamol.com.eg', '+201066677258', '+201066677258', 'شركة صناعات هندسية ومعدات.', 'Official website', 'https://www.takamol.com.eg/contactus', 'not_contacted', false, 95),
  ('مأرب الدولية للملابس الجاهزة', 'Marib International Garments Co.', 'ملابس جاهزة وتصدير', 'القليوبية', 'مدينة العبور', 'المنطقة الصناعية', 'https://maribgarments.com.eg', 'info@maribgarments.com.eg', '+20244890113', null, 'مصنع ملابس جاهزة للتوريد والتصدير.', 'Official website', 'https://maribgarments.com.eg/', 'not_contacted', false, 95),
  ('كان لتصنيع وتعبئة العبوات', 'Can for Manufacturing and Filling Cans', 'عبوات معدنية وتعبئة', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية B2', 'https://can.com.eg', 'can@can.com.eg', '+20554501261', '+201005680075', 'تصنيع وتعبئة العبوات المعدنية.', 'Official website', 'https://can.com.eg/Home/Contact', 'not_contacted', false, 95),
  ('نانا سيكريت', 'Nana Secret', 'منسوجات وملابس', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية الثالثة', 'https://nanasecret.com.eg', 'info@nanasecret.com.eg', '+201033332626', '+201033332626', 'مصنع منتجات نسيجية وملابس.', 'Official website', 'https://nanasecret.com.eg/contact-us/', 'not_contacted', false, 90),
  ('الشريف للصناعات', 'Al Sharif Industries', 'صناعات متنوعة', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية B2', 'https://www.alsharif.com.eg', 'alsharif@alsharif.com.eg', '+2015373892', '+20123988850', 'منشأة صناعية في المنطقة الصناعية بالعاشر من رمضان.', 'Official website', 'https://www.alsharif.com.eg/contact.htm', 'not_contacted', false, 85),
  ('إنترناشيونال باك لأنظمة التغليف', 'International Pack for Packaging Systems', 'ماكينات تعبئة وتغليف', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية - طريق الروبيكي', 'https://internationalpack.com.eg', 'info@internationalpack.com.eg', '+201020930000', '+201020930000', 'مصنع ومورد ماكينات وأنظمة التعبئة والتغليف.', 'Official website', 'https://internationalpack.com.eg/contact', 'not_contacted', false, 95),
  ('أكتيفا', 'ACTIVA', 'صناعات وتجهيزات', 'الشرقية', 'العاشر من رمضان', 'Industria Asher Park', 'https://activa.com.eg', 'info@activa.com.eg', '+201012777140', '+201012777140', 'شركة صناعية مقرها العاشر من رمضان.', 'Official website', 'https://activa.com.eg/contact-us/', 'not_contacted', false, 95),
  ('جوناس للصناعات الغذائية', 'Jonas Food Industries', 'صناعات غذائية', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية A7 غرب', 'https://www.jonas.com.eg', 'jonas@jonas.com.eg', '+20554334460', '+201010262737', 'شركة صناعات غذائية وحلويات وشوكولاتة.', 'Official website', 'https://www.jonas.com.eg/en/contact', 'not_contacted', false, 90),
  ('دايموند تكس', 'Diamond Tex', 'منسوجات', 'الشرقية', 'العاشر من رمضان', 'المنطقة الصناعية A3', 'https://diamondtex.com.eg', 'admin@diamondtex.com.eg', '+201226929405', '+201226929405', 'مصنع منسوجات في العاشر من رمضان.', 'Official website', 'https://diamondtex.com.eg/?page_id=4318', 'not_contacted', false, 90)
) as v(name_ar, name_en, industry, governorate, city, industrial_zone, website, email, phone, whatsapp, description, source_name, source_url, contact_status, is_published, data_quality_score)
where not exists (
  select 1 from public.company_prospects p
  where (v.email is not null and lower(p.email)=lower(v.email))
     or (v.phone is not null and p.phone=v.phone)
);
