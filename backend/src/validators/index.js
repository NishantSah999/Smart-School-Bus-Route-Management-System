const { z } = require('zod');

const email = z.string().email('Invalid email').max(190);
const phone = z.string().max(30).regex(/^[+0-9()\s-]{6,30}$/, 'Invalid phone number').optional().or(z.literal('').transform(() => undefined));

const loginSchema = z.object({
  email: email,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

const createSchoolSchema = z.object({
  name: z.string().min(2).max(190),
  code: z.string().min(2).max(30),
  address: z.string().max(1000).optional(),
  phone: phone,
  email: email.optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const updateSchoolSchema = createSchoolSchema.partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional() });

const createBusSchema = z.object({
  bus_number: z.string().min(1).max(30),
  registration_number: z.string().min(1).max(60),
  model: z.string().max(120).optional(),
  capacity: z.number().int().min(1).max(200).optional(),
  device_id: z.string().max(120).optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  school_id: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'IDLE', 'ON_ROUTE', 'AT_STOP', 'MAINTENANCE', 'OFFLINE']).optional(),
  fuel_type: z.string().max(20).optional(),
});

const updateBusSchema = createBusSchema.partial();

const createDriverSchema = z.object({
  user_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(2).max(120),
  phone: phone,
  license_number: z.string().min(3).max(60),
  license_expiry: z.coerce.date(),
  emergency_contact: phone,
  date_of_birth: z.coerce.date().optional(),
  experience_years: z.number().int().min(0).max(60).optional(),
  status: z.enum(['AVAILABLE', 'ON_DUTY', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']).optional(),
  school_id: z.number().int().positive().optional(),
});

const updateDriverSchema = createDriverSchema.partial();

const createRouteSchema = z.object({
  name: z.string().min(2).max(120),
  route_code: z.string().min(1).max(30),
  description: z.string().max(1000).optional(),
  school_id: z.number().int().positive().optional(),
  start_location: z.string().max(190).optional(),
  end_location: z.string().max(190).optional(),
  estimated_duration: z.number().int().min(0).optional(),
  distance: z.number().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  speed_limit: z.number().min(5).max(200).optional(),
});

const updateRouteSchema = createRouteSchema.partial();

const createStopSchema = z.object({
  route_id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  address: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sequence: z.number().int().min(0).optional(),
  estimated_arrival: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM format').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

const updateStopSchema = createStopSchema.partial();

const reorderStopsSchema = z.object({ ids: z.array(z.number().int().positive()).min(1) });

const createParentSchema = z.object({
  user_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(2).max(120),
  phone: phone,
  email: email.optional().or(z.literal('')),
  relationship: z.string().max(30).optional(),
  emergency_contact: phone,
  notification_enabled: z.boolean().optional(),
});

const updateParentSchema = createParentSchema.partial();

const createStudentSchema = z.object({
  student_id: z.string().min(2).max(30),
  name: z.string().min(2).max(120),
  date_of_birth: z.coerce.date().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  grade: z.string().max(20).optional(),
  section: z.string().max(10).optional(),
  school_id: z.number().int().positive().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  route_id: z.number().int().positive().nullable().optional(),
  bus_id: z.number().int().positive().nullable().optional(),
  pickup_stop_id: z.number().int().positive().nullable().optional(),
  drop_stop_id: z.number().int().positive().nullable().optional(),
  photo: z.string().url().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

const updateStudentSchema = createStudentSchema.partial();

const locationSchema = z.object({
  bus_id: z.number().int().positive(),
  device_id: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(400).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional(),
});

const startTripSchema = z.object({
  bus_id: z.number().int().positive(),
  route_id: z.number().int().positive().nullable().optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  trip_type: z.enum(['MORNING', 'AFTERNOON', 'SPECIAL']).optional(),
  start_latitude: z.number().min(-90).max(90).optional(),
  start_longitude: z.number().min(-180).max(180).optional(),
  passenger_count: z.number().int().min(0).optional(),
});

const endTripSchema = z.object({
  end_latitude: z.number().min(-90).max(90).optional(),
  end_longitude: z.number().min(-180).max(180).optional(),
  distance: z.number().min(0).optional(),
  duration: z.number().int().min(0).optional(),
});

const createAlertSchema = z.object({
  type: z.enum(['DROWSINESS', 'SOS', 'OVERSPEED', 'HARSH_BRAKING', 'ACCIDENT', 'GEOFENCE', 'BUS_OFFLINE', 'MAINTENANCE', 'LATE_ARRIVAL', 'ROUTE_DEVIATION', 'EMERGENCY_BUTTON']),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']).optional(),
  bus_id: z.number().int().positive().nullable().optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  route_id: z.number().int().positive().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  message: z.string().max(2000).optional(),
});

const setAlertStatusSchema = z.object({ status: z.enum(['ACKNOWLEDGED', 'RESOLVED']) });

const recordAttendanceSchema = z.object({
  student_id: z.number().int().positive(),
  trip_id: z.number().int().positive().nullable().optional(),
  bus_id: z.number().int().positive().nullable().optional(),
  stop_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['BOARDED', 'NOT_BOARDED', 'ABSENT', 'DROPPED_OFF', 'UNKNOWN']),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  method: z.enum(['MANUAL', 'QR', 'RFID', 'NFC', 'DRIVER', 'PARENT']).optional(),
});

const createMaintenanceSchema = z.object({
  bus_id: z.number().int().positive(),
  service_date: z.coerce.date(),
  next_service: z.coerce.date().optional(),
  odometer: z.number().min(0).optional(),
  status: z.enum(['GOOD', 'DUE_SOON', 'OVERDUE', 'IN_SERVICE']).optional(),
  oil: z.string().max(60).optional(),
  tyres: z.string().max(60).optional(),
  brakes: z.string().max(60).optional(),
  battery: z.string().max(60).optional(),
  insurance_due: z.coerce.date().optional(),
  registration_due: z.coerce.date().optional(),
  remarks: z.string().max(2000).optional(),
});

const updateMaintenanceSchema = createMaintenanceSchema.partial();

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/, 'Invalid id').transform(Number) });

module.exports = {
  loginSchema,
  refreshSchema,
  createSchoolSchema,
  updateSchoolSchema,
  createBusSchema,
  updateBusSchema,
  createDriverSchema,
  updateDriverSchema,
  createRouteSchema,
  updateRouteSchema,
  createStopSchema,
  updateStopSchema,
  reorderStopsSchema,
  createParentSchema,
  updateParentSchema,
  createStudentSchema,
  updateStudentSchema,
  locationSchema,
  startTripSchema,
  endTripSchema,
  createAlertSchema,
  setAlertStatusSchema,
  recordAttendanceSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
  idParamSchema,
};