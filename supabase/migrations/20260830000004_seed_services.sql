-- NaijaFix: Seed 114 services
-- Idempotent: safe to run multiple times.
-- Uses slug-based upsert to avoid duplicates.

-- Home & Construction
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Electrical', 'electrical', 'Electrical', 'Wiring, sockets, lighting and repairs', true, 1),
  ('Plumbing', 'plumbing', 'Plumbing', 'Pipes, leaks, toilets and water systems', true, 2),
  ('Cleaning', 'cleaning', 'Cleaning', 'Home, office and deep cleaning', true, 3),
  ('AC Repair', 'ac-repair', 'AC Repair', 'Air conditioner installation and repair', true, 4),
  ('Generator Repair', 'generator-repair', 'Generator Repair', 'Generator servicing and repairs', true, 5),
  ('Carpentry', 'carpentry', 'Carpentry', 'Furniture, doors and woodwork', true, 6),
  ('Painting', 'painting', 'Painting', 'Interior and exterior painting', true, 7),
  ('House Building & Construction', 'house-building', 'House Building & Construction', 'Complete building construction services', true, 8),
  ('Roofing', 'roofing', 'Roofing', 'Roof installation and repairs', true, 9),
  ('Tiling & Flooring', 'tiling-flooring', 'Tiling & Flooring', 'Floor tiles, tiles installation and flooring', true, 10),
  ('POP & Ceiling', 'pop-ceiling', 'POP & Ceiling', 'POP ceiling design and installation', true, 11),
  ('Plastering & Screeding', 'plastering-screeding', 'Plastering & Screeding', 'Wall plastering and floor screeding', true, 12),
  ('Welding & Fabrication', 'welding-fabrication', 'Welding & Fabrication', 'Metal welding and fabrication services', true, 13),
  ('Aluminium & Glass', 'aluminium-glass', 'Aluminium & Glass', 'Windows, doors and glass installations', true, 14),
  ('Furniture Making', 'furniture-making', 'Furniture Making', 'Custom furniture design and production', true, 15),
  ('Furniture Repair', 'furniture-repair', 'Furniture Repair', 'Furniture restoration and repairs', true, 16),
  ('Interior Decoration', 'interior-decoration', 'Interior Decoration', 'Home and office interior design', true, 17),
  ('Handyman', 'handyman', 'Handyman', 'General household repairs and fixes', true, 18),
  ('Gardening & Landscaping', 'gardening-landscaping', 'Gardening & Landscaping', 'Garden design and maintenance', true, 19),
  ('Fumigation & Pest Control', 'fumigation-pest-control', 'Fumigation & Pest Control', 'Pest elimination and prevention', true, 20)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Power & Security
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Solar Installation', 'solar-installation', 'Solar Installation', 'Solar panel and system installation', true, 21),
  ('Solar Repair', 'solar-repair', 'Solar Repair', 'Solar system maintenance and repairs', true, 22),
  ('Inverter Installation', 'inverter-installation', 'Inverter Installation', 'Inverter setup and installation', true, 23),
  ('Inverter Repair', 'inverter-repair', 'Inverter Repair', 'Inverter servicing and repairs', true, 24),
  ('CCTV Installation', 'cctv-installation', 'CCTV Installation', 'Security camera installation and setup', true, 25),
  ('Security Systems', 'security-systems', 'Security Systems', 'Alarm and security system installation', true, 26),
  ('DSTV / Satellite Installation', 'dstv-satellite', 'DSTV / Satellite Installation', 'Satellite TV installation and setup', true, 27),
  ('Borehole Services', 'borehole-services', 'Borehole Services', 'Borehole drilling and water solutions', true, 28),
  ('Water Pump Repair', 'water-pump-repair', 'Water Pump Repair', 'Water pump servicing and repairs', true, 29),
  ('Water Tank Services', 'water-tank-services', 'Water Tank Services', 'Water tank installation and cleaning', true, 30)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Auto & Transport
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Auto Mechanic', 'auto-mechanic', 'Auto Mechanic', 'Car engine and mechanical repairs', true, 31),
  ('Auto Electrical', 'auto-electrical', 'Auto Electrical', 'Vehicle electrical system repairs', true, 32),
  ('Car AC Repair', 'car-ac-repair', 'Car AC Repair', 'Vehicle air conditioning service', true, 33),
  ('Tyre Services', 'tyre-services', 'Tyre Services', 'Tyre replacement and repairs', true, 34),
  ('Vulcanizing', 'vulcanizing', 'Vulcanizing', 'Tyre puncture repair and vulcanizing', true, 35),
  ('Car Wash', 'car-wash', 'Car Wash', 'Vehicle washing and cleaning', true, 36),
  ('Car Detailing', 'car-detailing', 'Car Detailing', 'Professional vehicle detailing service', true, 37),
  ('Car Painting', 'car-painting', 'Car Painting', 'Vehicle spray and painting', true, 38),
  ('Panel Beating', 'panel-beating', 'Panel Beating', 'Vehicle body repair and panel beating', true, 39),
  ('Car Battery Services', 'car-battery-services', 'Car Battery Services', 'Battery replacement and charging', true, 40),
  ('Towing', 'towing', 'Towing', 'Vehicle towing and recovery', true, 41),
  ('Driver / Chauffeur', 'driver-chauffeur', 'Driver / Chauffeur', 'Professional driver services', true, 42),
  ('Moving & Relocation', 'moving-relocation', 'Moving & Relocation', 'Home and office moving services', true, 43)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Delivery & Errands
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Dispatch Riders', 'dispatch-riders', 'Dispatch Riders', 'Motorcycle dispatch and delivery', true, 44),
  ('Package Delivery', 'package-delivery', 'Package Delivery', 'Package pickup and delivery', true, 45),
  ('Food Delivery', 'food-delivery', 'Food Delivery', 'Restaurant food delivery service', true, 46),
  ('Grocery Delivery', 'grocery-delivery', 'Grocery Delivery', 'Grocery shopping and delivery', true, 47),
  ('Document Delivery', 'document-delivery', 'Document Delivery', 'Document pickup and delivery', true, 48),
  ('Errand Runner', 'errand-runner', 'Errand Runner', 'Personal errands and tasks', true, 49),
  ('Pickup & Drop-off', 'pickup-dropoff', 'Pickup & Drop-off', 'Item pickup and drop-off service', true, 50)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Technology & Digital
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Phone Repair', 'phone-repair', 'Phone Repair', 'Screen, battery and software repairs', true, 51),
  ('Computer Repair', 'computer-repair', 'Computer Repair', 'Laptop, desktop and software support', true, 52),
  ('Laptop Repair', 'laptop-repair', 'Laptop Repair', 'Laptop hardware and software fixes', true, 53),
  ('Printer Repair', 'printer-repair', 'Printer Repair', 'Printer servicing and repairs', true, 54),
  ('TV Repair', 'tv-repair', 'TV Repair', 'Television repair and maintenance', true, 55),
  ('Electronics Repair', 'electronics-repair', 'Electronics Repair', 'Electronic device repairs', true, 56),
  ('Wi-Fi & Internet Setup', 'wifi-internet-setup', 'Wi-Fi & Internet Setup', 'Internet and Wi-Fi installation', true, 57),
  ('Network Installation', 'network-installation', 'Network Installation', 'Network cabling and setup', true, 58),
  ('Web Development', 'web-development', 'Web Development', 'Website design and development', true, 59),
  ('Mobile App Development', 'mobile-app-development', 'Mobile App Development', 'Mobile app design and development', true, 60),
  ('Graphic Design', 'graphic-design', 'Graphic Design', 'Logo, flyer and design services', true, 61),
  ('Video Editing', 'video-editing', 'Video Editing', 'Video production and editing', true, 62),
  ('Photography', 'photography', 'Photography', 'Professional photography services', true, 63),
  ('Videography', 'videography', 'Videography', 'Professional video production', true, 64),
  ('Social Media Management', 'social-media-management', 'Social Media Management', 'Social media accounts management', true, 65),
  ('Digital Marketing', 'digital-marketing', 'Digital Marketing', 'Online marketing and advertising', true, 66),
  ('Virtual Assistant', 'virtual-assistant', 'Virtual Assistant', 'Remote administrative support', true, 67)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Beauty & Personal Care
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Fashion & Tailoring', 'fashion-tailoring', 'Fashion and Tailoring', 'Tailoring, alterations and fashion', true, 68),
  ('Barbering', 'barbering', 'Barbering', 'Professional haircut and grooming', true, 69),
  ('Beauty', 'beauty', 'Beauty', 'Hair, makeup and beauty services', true, 70),
  ('Hairdressing', 'hairdressing', 'Hairdressing', 'Hair styling and treatment', true, 71),
  ('Braiding / Locs', 'braiding-locs', 'Braiding / Locs', 'Hair braiding and dreadlocks', true, 72),
  ('Makeup Artist', 'makeup-artist', 'Makeup Artist', 'Professional makeup application', true, 73),
  ('Nail Technician', 'nail-technician', 'Nail Technician', 'Nail art and manicure services', true, 74),
  ('Manicure & Pedicure', 'manicure-pedicure', 'Manicure & Pedicure', 'Nail care and treatment', true, 75),
  ('Massage', 'massage', 'Massage', 'Therapeutic and relaxation massage', true, 76),
  ('Fitness Trainer', 'fitness-trainer', 'Fitness Trainer', 'Personal fitness training', true, 77)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Family & Education
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Home Tutor', 'home-tutor', 'Home Tutor', 'In-home academic tutoring', true, 78),
  ('JAMB / WAEC Tutor', 'jamb-waec-tutor', 'JAMB / WAEC Tutor', 'Exam preparation tutoring', true, 79),
  ('Primary / Secondary Tutor', 'primary-secondary-tutor', 'Primary / Secondary Tutor', 'School subject tutoring', true, 80),
  ('Music Teacher', 'music-teacher', 'Music Teacher', 'Musical instrument and vocal lessons', true, 81),
  ('Language Tutor', 'language-tutor', 'Language Tutor', 'Foreign and local language lessons', true, 82),
  ('Driving Instructor', 'driving-instructor', 'Driving Instructor', 'Driving lessons and test preparation', true, 83),
  ('Nanny / Childcare', 'nanny-childcare', 'Nanny / Childcare', 'Childcare and babysitting', true, 84),
  ('Elderly Care / Caregiver', 'elderly-care', 'Elderly Care / Caregiver', 'Elderly care and assistance', true, 85),
  ('Home Cook / Personal Chef', 'home-cook', 'Home Cook / Personal Chef', 'Meal preparation and cooking', true, 86)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Fashion & Laundry
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Clothing Alteration', 'clothing-alteration', 'Clothing Alteration', 'Clothing resizing and alterations', true, 87),
  ('Shoe Making', 'shoe-making', 'Shoe Making', 'Custom shoe design and production', true, 88),
  ('Shoe Repair', 'shoe-repair', 'Shoe Repair', 'Shoe mending and restoration', true, 89),
  ('Bag Making', 'bag-making', 'Bag Making', 'Custom bag design and production', true, 90),
  ('Laundry', 'laundry', 'Laundry', 'Washing, drying and folding', true, 91),
  ('Dry Cleaning', 'dry-cleaning', 'Dry Cleaning', 'Professional dry cleaning service', true, 92)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Events & Food Services
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Catering', 'catering', 'Catering', 'Food catering for events', true, 93),
  ('Small Chops', 'small-chops', 'Small Chops', 'Small chops and snacks for events', true, 94),
  ('Cake & Baking', 'cake-baking', 'Cake & Baking', 'Custom cakes and baking', true, 95),
  ('Event Planning', 'event-planning', 'Event Planning', 'Event coordination and planning', true, 96),
  ('Event Decoration', 'event-decoration', 'Event Decoration', 'Event venue decoration', true, 97),
  ('DJ', 'dj', 'DJ', 'DJ services for events', true, 98),
  ('MC / Compere', 'mc-compere', 'MC / Compere', 'Event hosting and compere', true, 99),
  ('Sound & Lighting', 'sound-lighting', 'Sound & Lighting', 'Sound system and lighting rental', true, 100),
  ('Event Photography', 'event-photography', 'Event Photography', 'Professional event photography', true, 101),
  ('Event Videography', 'event-videography', 'Event Videography', 'Professional event videography', true, 102),
  ('Equipment Rentals', 'equipment-rentals', 'Equipment Rentals', 'Event equipment rental', true, 103)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

-- Professional Services
insert into public.services (name, slug, category, description, active, sort_order) values
  ('Pet Grooming', 'pet-grooming', 'Pet Grooming', 'Pet washing and grooming', true, 104),
  ('Pet Sitting', 'pet-sitting', 'Pet Sitting', 'Pet care and sitting', true, 105),
  ('Pet Walking', 'pet-walking', 'Pet Walking', 'Dog walking and exercise', true, 106),
  ('Legal Services', 'legal-services', 'Legal Services', 'Legal advice and representation', true, 107),
  ('Accounting', 'accounting', 'Accounting', 'Bookkeeping and accounting', true, 108),
  ('Tax Services', 'tax-services', 'Tax Services', 'Tax preparation and filing', true, 109),
  ('Recruitment Services', 'recruitment-services', 'Recruitment Services', 'Staff recruitment and HR', true, 110),
  ('Travel / Tour Services', 'travel-tour-services', 'Travel / Tour Services', 'Travel booking and tours', true, 111),
  ('Printing Services', 'printing-services', 'Printing Services', 'Document and materials printing', true, 112),
  ('Translation', 'translation', 'Translation', 'Document and language translation', true, 113),
  ('Professional Consulting', 'professional-consulting', 'Professional Consulting', 'Business and professional advice', true, 114)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;
