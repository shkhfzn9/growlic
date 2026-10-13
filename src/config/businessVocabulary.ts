export interface BusinessVocabulary {
  catalogTitle: string;
  catalogSubtitle: string;
  itemNoun: string;
  itemsNoun: string;
  categoryNoun: string;
  prepArea: string;
  prepStaff: string;
  orderNoun: string;
  ordersNoun: string;
  tableNoun: string;
  inHouseFulfillment: string;
  takeawayFulfillment: string;
  maintenanceAlert: string;
  processDetailsLabel: string;
  suppliesLabel: string;
  timeEstimateLabel: string;
  noteLabel: string;
  addItemTitle: string;
  editItemTitle: string;
}

export const VOCABULARIES: Record<string, BusinessVocabulary> = {
  salon: {
    catalogTitle: 'Service Catalog',
    catalogSubtitle: 'Manage salon services, packages & pricing',
    itemNoun: 'Service',
    itemsNoun: 'Services',
    categoryNoun: 'Service Category',
    prepArea: 'Service Station',
    prepStaff: 'Stylist / Therapist',
    orderNoun: 'Booking',
    ordersNoun: 'Bookings & Appointments',
    tableNoun: 'Station / Chair #',
    inHouseFulfillment: 'In-Salon Service',
    takeawayFulfillment: 'Home Visit Service',
    maintenanceAlert: 'Station Under Maintenance',
    processDetailsLabel: 'Service Process & Details',
    suppliesLabel: 'Products & Serums Used',
    timeEstimateLabel: 'Estimated Service Time (Mins)',
    noteLabel: 'Specialist Note',
    addItemTitle: 'Add New Service',
    editItemTitle: 'Edit Service',
  },
  detailing: {
    catalogTitle: 'Detailing Package Catalog',
    catalogSubtitle: 'Manage ceramic coating, polishing & wash packages',
    itemNoun: 'Package',
    itemsNoun: 'Detailing Packages',
    categoryNoun: 'Package Category',
    prepArea: 'Detailing Bay',
    prepStaff: 'Detailing Specialist',
    orderNoun: 'Appointment',
    ordersNoun: 'Appointments & Jobs',
    tableNoun: 'Detailing Bay #',
    inHouseFulfillment: 'Studio Detailing',
    takeawayFulfillment: 'Doorstep Service',
    maintenanceAlert: 'Detailing Bay Under Maintenance',
    processDetailsLabel: 'Application & Detailing Procedure',
    suppliesLabel: 'Coatings & Compounds Used',
    timeEstimateLabel: 'Estimated Work Time (Mins)',
    noteLabel: 'Master Detailer Note',
    addItemTitle: 'Add New Detailing Package',
    editItemTitle: 'Edit Detailing Package',
  },
  retail: {
    catalogTitle: 'Product Storefront Catalog',
    catalogSubtitle: 'Manage inventory items, pricing & stock',
    itemNoun: 'Product',
    itemsNoun: 'Products & Apparel',
    categoryNoun: 'Product Category',
    prepArea: 'Fulfillment Station',
    prepStaff: 'Store Associate',
    orderNoun: 'Order',
    ordersNoun: 'Orders & Deliveries',
    tableNoun: 'Section / Counter #',
    inHouseFulfillment: 'In-Store Pick Up',
    takeawayFulfillment: 'Home Delivery',
    maintenanceAlert: 'Store Under Maintenance',
    processDetailsLabel: 'Material & Care Instructions',
    suppliesLabel: 'Key Features & Materials',
    timeEstimateLabel: 'Estimated Packing Time (Mins)',
    noteLabel: 'Store Manager Note',
    addItemTitle: 'Add New Product',
    editItemTitle: 'Edit Product Item',
  },
  restaurant: {
    catalogTitle: 'Digital Menu & Stock Control',
    catalogSubtitle: 'Manage menu items, prices, and instant item stock availability',
    itemNoun: 'Item',
    itemsNoun: 'Dishes & Items',
    categoryNoun: 'Dish Category',
    prepArea: 'Kitchen',
    prepStaff: 'Kitchen Staff / Chef',
    orderNoun: 'Order',
    ordersNoun: 'Orders & Kitchen Analytics',
    tableNoun: 'Table #',
    inHouseFulfillment: 'Dine-in',
    takeawayFulfillment: 'Takeaway',
    maintenanceAlert: 'Kitchen Under Maintenance',
    processDetailsLabel: 'Preparation Details',
    suppliesLabel: 'Ingredients',
    timeEstimateLabel: 'Prep Time (Mins)',
    noteLabel: "Chef's Note",
    addItemTitle: 'Add New Menu Item',
    editItemTitle: 'Edit Menu Item',
  },
};

export function getVocabulary(category?: string): BusinessVocabulary {
  if (!category) return VOCABULARIES.restaurant;
  return VOCABULARIES[category.toLowerCase()] || VOCABULARIES.restaurant;
}

export function getDelayReasons(category?: string): string[] {
  switch (category?.toLowerCase()) {
    case 'salon':
      return [
        'Stylist / Chair Occupied from Previous Booking',
        'Special Treatment Setup & Product Prep',
        'Client Customization / Extra Service Requested',
        'Staff Shortage during Peak Hour',
        'Sanitization & Station Reset Delay',
        'Other / Custom Note',
      ];
    case 'detailing':
      return [
        'Bay Occupied / Paint Correction Cure Time',
        'Special Coating Prep & Decontamination',
        'Vehicle Heavy Soil / Deep Cleaning Needed',
        'Technician Shortage during Peak Hour',
        'Drying & Curing Chamber Delay',
        'Other / Custom Note',
      ];
    case 'retail':
      return [
        'Inventory Replenishment & Stock Check',
        'Custom Packaging & Gift Wrap Request',
        'Special Dispatch & Courier Pickup Delay',
        'Store Associate Busy with In-Store Customers',
        'Quality Inspection Failure / Replacement',
        'Other / Custom Note',
      ];
    case 'restaurant':
    default:
      return [
        'Kitchen Rush & Heavy Wok Load',
        'Ingredient Shortage / Prep Refill',
        'Special Customer Customization',
        'Staff Shortage during Peak Hour',
        'Takeaway Packaging Queue',
        'Other / Custom Note',
      ];
  }
}

export function getRejectionReasons(category?: string): string[] {
  switch (category?.toLowerCase()) {
    case 'salon':
      return [
        'Slot Unavailable / Fully Booked Chair',
        'Required Stylist / Specialist Unavailable',
        'Special Treatment Request Unfulfillable',
        'Salon Closing Soon / Last Appointment Passed',
        'Invalid / Incorrect Contact Info',
        'Other Reason (Write below)',
      ];
    case 'detailing':
      return [
        'Detailing Bay Full / Slot Booked',
        'Required Coating / Material Out of Stock',
        'Vehicle Model / Condition Unserviceable',
        'Studio Closing Soon / Bad Weather Condition',
        'Invalid / Incorrect Contact Info',
        'Other Reason (Write below)',
      ];
    case 'retail':
      return [
        'Product Out of Stock / Damaged Item',
        'Delivery Area Unserviceable',
        'Bulk Quantity Unfulfillable',
        'Store Closing Soon',
        'Invalid / Incorrect Contact Info',
        'Other Reason (Write below)',
      ];
    case 'restaurant':
    default:
      return [
        'Item Out of Stock / Unavailable',
        'Kitchen Rush & Capacity Full',
        'Special Request Unfulfillable',
        'Restaurant Closing Soon',
        'Invalid / Incorrect Contact Info',
        'Other Reason (Write below)',
      ];
  }
}

export interface DefaultBanner {
  _id?: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  active?: boolean;
}

export function getDefaultBanners(category?: string, restaurantId: string = ''): DefaultBanner[] {
  const restId = restaurantId || '';
  const baseLink = restId ? `/menu/${restId}` : '#';

  switch (category?.toLowerCase()) {
    case 'salon':
      return [
        {
          _id: 'default-specials',
          title: "Free Hair Wash & Styling\nwith any Hair Color!",
          subtitle: "Complimentary treatment with service",
          buttonText: "Book Service",
          buttonLink: restId ? `/menu/${restId}?category=Hair%20Styling%20%26%20Treatment` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4pyC77iPPC90ZXh0Pjwvc3ZnPg=='
        },
        {
          _id: 'default-discount',
          title: "Get 10% OFF on\nservices above ₹999!",
          subtitle: "Discount applied automatically at checkout",
          buttonText: "Explore Services",
          buttonLink: baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+SmTwvdGV4dD48L3N2Zz4='
        },
        {
          _id: 'default-combo',
          title: "Free Hair Spa & Styling\non weekend packages!",
          subtitle: "Special salon combo active today",
          buttonText: "Book Appointment",
          buttonLink: restId ? `/menu/${restId}?category=Specialist%20Treatments` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+SparklesPC90ZXh0Pjwvc3ZnPg=='
        }
      ];
    case 'detailing':
      return [
        {
          _id: 'default-specials',
          title: "Free Interior Detailing\nwith Ceramic Coating!",
          subtitle: "Complete car protection package",
          buttonText: "Book Detailing",
          buttonLink: restId ? `/menu/${restId}?category=Paint%20Protection%20%26%20Coating` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+aqDwvdGV4dD48L3N2Zz4='
        },
        {
          _id: 'default-discount',
          title: "Get 10% OFF on\njobs above ₹1999!",
          subtitle: "Discount applied automatically at checkout",
          buttonText: "Explore Packages",
          buttonLink: baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TrzwvdGV4dD48L3N2Zz4='
        },
        {
          _id: 'default-combo',
          title: "Free Car Wash & Polish\nfor inaugural studio visit!",
          subtitle: "Special inaugural detailing offer",
          buttonText: "Book Appointment",
          buttonLink: restId ? `/menu/${restId}?category=Full%20Car%20Detailing` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+CofCfjKg8L3RleHQ+PC9zdmc+'
        }
      ];
    case 'retail':
      return [
        {
          _id: 'default-specials',
          title: "Buy 2 Get 1 FREE\non all Fashion Apparel!",
          subtitle: "Mix & match any items in store",
          buttonText: "Shop Products",
          buttonLink: restId ? `/menu/${restId}?category=Apparel%20%26%20Clothing` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+RmpCfjZkPC90ZXh0Pjwvc3ZnPg=='
        },
        {
          _id: 'default-discount',
          title: "Get 10% OFF on\norders above ₹499!",
          subtitle: "Discount applied automatically at checkout",
          buttonText: "Explore Store",
          buttonLink: baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OmDwvdGV4dD48L3N2Zz4='
        },
        {
          _id: 'default-combo',
          title: "Free Express Delivery\non today's new arrivals",
          subtitle: "Instant home delivery available",
          buttonText: "Shop Now",
          buttonLink: restId ? `/menu/${restId}?category=Footwear%20%26%20Accessories` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TpjwvdGV4dD48L3N2Zz4='
        }
      ];
    case 'restaurant':
    default:
      return [
        {
          _id: 'default-specials',
          title: "Free delivery for\ntoday's specials",
          subtitle: "Up to 3 times per day",
          buttonText: "Order now",
          buttonLink: baseLink,
          image: '/dish_placeholder.jpg'
        },
        {
          _id: 'default-discount',
          title: "Get 10% OFF on\norders above ₹399!",
          subtitle: "Discount applied automatically at checkout",
          buttonText: "Browse Menu",
          buttonLink: baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+NuDwvdGV4dD48L3N2Zz4='
        },
        {
          _id: 'default-combo',
          title: "Add a Drink at 50% OFF\nwith any Momos!",
          subtitle: "Combo discount active today",
          buttonText: "Order Momos",
          buttonLink: restId ? `/menu/${restId}?category=Classic%20Momos` : baseLink,
          image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+lnzwvdGV4dD48L3N2Zz4='
        }
      ];
  }
}

export interface PresetImage {
  name: string;
  value: string;
}

export function getDomainPresetImages(category?: string): PresetImage[] {
  switch (category?.toLowerCase()) {
    case 'salon':
      return [
        {
          name: 'Cosmetics & Beauty Image',
          value: '/cosmetics.jpg',
        },
        {
          name: 'Hair Styling Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4pyC77iPPC90ZXh0Pjwvc3ZnPg==',
        },
        {
          name: 'Beauty Spa & Glow Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+SmTwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Specialist Treatment Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+SparklesPC90ZXh0Pjwvc3ZnPg==',
        },
      ];
    case 'detailing':
      return [
        {
          name: 'Ceramic Coating Shield Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+aqDwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Car Wash & Polish Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+CofCfjKg8L3RleHQ+PC9zdmc+',
        },
        {
          name: 'Detailing Bay Wrench Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TrzwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Placeholder Studio Image',
          value: '/dish_placeholder.jpg',
        },
      ];
    case 'retail':
      return [
        {
          name: 'Apparel & Fashion Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+RmpCfjZkPC90ZXh0Pjwvc3ZnPg==',
        },
        {
          name: 'Shopping Store Bag Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OmDwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Express Delivery Box Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TpjwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Cosmetics & Accessories Image',
          value: '/cosmetics.jpg',
        },
      ];
    case 'restaurant':
    default:
      return [
        {
          name: 'Steamed Momos Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+lnzwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Rice Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+fjzwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Drinks / Bowl Icon',
          value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+NuDwvdGV4dD48L3N2Zz4=',
        },
        {
          name: 'Placeholder Dish Image',
          value: '/dish_placeholder.jpg',
        },
      ];
  }
}

export function getDomainCategories(category?: string): string[] {
  switch (category?.toLowerCase()) {
    case 'salon':
      return [
        'Hair Styling & Treatment',
        'Skin & Facial Care',
        'Nails & Beauty',
        'Massage & Body Spa',
        'Specialist Treatments',
      ];
    case 'detailing':
      return [
        'Paint Protection & Coating',
        'Wash & Polish',
        'Interior Detailing',
        'Studio Care',
      ];
    case 'retail':
      return [
        'Apparel & Fashion',
        'Accessories',
        'Bags & Luggage',
        'Footwear',
      ];
    case 'restaurant':
    default:
      return [
        'Classic Momos',
        'Momos Gravy Add Ons',
        'Momos Woksizzle',
        'Tokyo Rice Paradise',
        'Tokyo Rice Bowls',
        'Tokyo Special',
        'Tokyo Soups',
        'Tokyo Noodles',
        'Tokyo Rolls',
        'Chicken Salad',
        'Fit Meals',
        'Additional Snacks',
      ];
  }
}

export interface DomainAddonInfo {
  title: string;
  items: string;
  desc: string;
  conditionCatPlaceholder: string;
  rewardTargetPlaceholder: string;
  messagePlaceholder: string;
}

export function getDomainAddonInfo(category?: string): DomainAddonInfo {
  switch (category?.toLowerCase()) {
    case 'salon':
      return {
        title: 'Special Add-on Service Boosters',
        items: 'Hair Wash, Spa Treatment, Scalp Serum',
        desc: 'Special add-on treatment upgrades offered on customer checkout bookings.',
        conditionCatPlaceholder: 'e.g. Hair Styling & Treatment',
        rewardTargetPlaceholder: 'e.g. Skin & Facial Care',
        messagePlaceholder: 'Free Hair Wash & Styling with any Hair Color!',
      };
    case 'detailing':
      return {
        title: 'Special Add-on Package Boosters',
        items: 'Tire Polish, Rain Repellent, Deodorizer',
        desc: 'Special add-on detailing upgrades offered on customer checkout bookings.',
        conditionCatPlaceholder: 'e.g. Paint Protection & Coating',
        rewardTargetPlaceholder: 'e.g. Wash & Polish',
        messagePlaceholder: 'Free Interior Detailing with Ceramic Coating!',
      };
    case 'retail':
      return {
        title: 'Special Add-on Product Boosters',
        items: 'Care Kit, Gift Wrap, Cleaning Cloth',
        desc: 'Special add-on accessories offered on customer checkout carts.',
        conditionCatPlaceholder: 'e.g. Apparel & Fashion',
        rewardTargetPlaceholder: 'e.g. Accessories',
        messagePlaceholder: 'Free Care Kit on orders above ₹1999!',
      };
    case 'restaurant':
    default:
      return {
        title: 'Special Add-on Cart Boosters',
        items: 'Chicken Popcorn, Peri Peri Strips',
        desc: 'Special add-on snacks offered on customer checkout carts.',
        conditionCatPlaceholder: 'e.g. Classic Momos',
        rewardTargetPlaceholder: 'e.g. Tokyo Soups',
        messagePlaceholder: 'Add a drink at 50% OFF with any Momos!',
      };
  }
}


