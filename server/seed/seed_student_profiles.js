import mongoose from 'mongoose';
import '../models/index.js';
import User from '../models/User.js';

const studentProfiles = [
  // CSE
  {
    email: 'student@demo.com',
    gender: 'male',
    dob: '2006-08-14',
    bloodGroup: 'O+',
    phone: '+91 98101 23456',
    guardianName: 'Ramesh Sharma',
    guardianPhone: '+91 98101 98765',
    address: 'Flat 402, Shivalik Residency, Sector 62, Noida, UP - 201301',
    bio: 'B.Tech CSE student (Sem 1) interested in Data Structures, Web Development, and Competitive Coding.',
    profilePhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'cse.pending@demo.com',
    gender: 'male',
    dob: '2006-11-22',
    bloodGroup: 'B+',
    phone: '+91 98202 34567',
    guardianName: 'Sunil Gupta',
    guardianPhone: '+91 98202 87654',
    address: 'B-12, Mayur Vihar Phase 1, New Delhi - 110091',
    bio: 'Freshman CSE engineer passionate about Machine Learning algorithms and open-source software.',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'rohit@demo.com',
    gender: 'male',
    dob: '2004-05-18',
    bloodGroup: 'A+',
    phone: '+91 98303 45678',
    guardianName: 'Alok Gupta',
    guardianPhone: '+91 98303 76543',
    address: 'Pocket 3, DDA SFS Flats, Dwarka Sector 11, New Delhi - 110075',
    bio: '3rd Year Computer Science student building full-stack applications and high-throughput backend microservices.',
    profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },

  // ECE
  {
    email: 'ece.paid@demo.com',
    gender: 'male',
    dob: '2005-09-02',
    bloodGroup: 'AB+',
    phone: '+91 98404 56789',
    guardianName: 'David Dhawan',
    guardianPhone: '+91 98404 65432',
    address: '45/2, Green Glen Layout, Bellandur, Bengaluru, KA - 560103',
    bio: '2nd Year ECE student focusing on Embedded Systems, IoT architecture, and digital signal processing.',
    profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'ece.pending@demo.com',
    gender: 'female',
    dob: '2005-03-27',
    bloodGroup: 'O+',
    phone: '+91 98505 67890',
    guardianName: 'Subhash Sen',
    guardianPhone: '+91 98505 54321',
    address: '7th Cross, Indiranagar Stage 2, Bengaluru, KA - 560038',
    bio: 'ECE undergraduate passionate about VLSI design, semiconductor devices, and robotic automation.',
    profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'karan@demo.com',
    gender: 'male',
    dob: '2005-12-10',
    bloodGroup: 'B+',
    phone: '+91 98606 78901',
    guardianName: 'Prakash Joshi',
    guardianPhone: '+91 98606 43210',
    address: 'House 88, Vasant Vihar, Dehradun, UK - 248006',
    bio: 'Electronics enthusiast exploring wireless communications, RF circuits, and antenna modeling.',
    profilePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  },

  // ME
  {
    email: 'me.paid@demo.com',
    gender: 'male',
    dob: '2004-07-21',
    bloodGroup: 'O-',
    phone: '+91 98707 89012',
    guardianName: 'Tariq Khan',
    guardianPhone: '+91 98707 32109',
    address: '22/A, Civil Lines, Jaipur, RJ - 302006',
    bio: 'Senior Mechanical Engineering student specialized in CAD/CAM modeling, CFD analysis, and automotive design.',
    profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'me.pending@demo.com',
    gender: 'female',
    dob: '2004-10-15',
    bloodGroup: 'A+',
    phone: '+91 98808 90123',
    guardianName: 'Anil Bhatia',
    guardianPhone: '+91 98808 21098',
    address: 'C-34, Model Town, Ludhiana, PB - 141002',
    bio: 'Mechanical engineer pursuing research in sustainable thermal systems, renewable energy, and robotics.',
    profilePhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'sanjay@demo.com',
    gender: 'male',
    dob: '2004-01-30',
    bloodGroup: 'B-',
    phone: '+91 98909 01234',
    guardianName: 'Venkatesh Iyer',
    guardianPhone: '+91 98909 10987',
    address: '14/3, R.A. Puram, Chennai, TN - 600028',
    bio: 'Mechanical Engineering senior exploring Mechatronics, industrial additive manufacturing, and FEA simulations.',
    profilePhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
  },

  // CE
  {
    email: 'ce.paid@demo.com',
    gender: 'male',
    dob: '2005-04-11',
    bloodGroup: 'O+',
    phone: '+91 98010 12345',
    guardianName: 'Dr. V.M. Koothrappali',
    guardianPhone: '+91 98010 98760',
    address: '71, South Extension Part 2, New Delhi - 110049',
    bio: 'Civil Engineering student passionate about structural engineering, earthquake resilience, and smart city infrastructure.',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'ce.pending@demo.com',
    gender: 'female',
    dob: '2005-06-25',
    bloodGroup: 'A+',
    phone: '+91 98111 23456',
    guardianName: 'Mahesh Bhatt',
    guardianPhone: '+91 98111 87654',
    address: 'Bandra West, Hill Road, Mumbai, MH - 400050',
    bio: 'Civil Engineering undergraduate focusing on environmental engineering, geotechnical analysis, and GIS mapping.',
    profilePhoto: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  },
  {
    email: 'geeta@demo.com',
    gender: 'female',
    dob: '2005-08-09',
    bloodGroup: 'AB+',
    phone: '+91 98222 34567',
    guardianName: 'Kishore Bhat',
    guardianPhone: '+91 98222 76543',
    address: 'Shivaji Nagar, Pune, MH - 411005',
    bio: 'Aspiring transportation engineer studying sustainable urban mobility, highway materials, and hydrology.',
    profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  },

  // Staff
  {
    email: 'admin@demo.com',
    gender: 'male',
    phone: '+91 99000 11223',
    profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    bio: 'Senior Finance Administrator overseeing counter collections, fee verification, and reconciliation.',
  },
  {
    email: 'super@demo.com',
    gender: 'female',
    phone: '+91 99000 33445',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    bio: 'Chief Bursar & Registrar managing institutional fee policies, bulk structures, and scholarships.',
  },
];

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ledgerx');
  console.log('Connected to MongoDB');

  for (const p of studentProfiles) {
    const user = await User.findOne({ email: p.email });
    if (user) {
      user.gender = p.gender;
      user.profilePhoto = p.profilePhoto;
      if (p.dob) user.dob = p.dob;
      if (p.bloodGroup) user.bloodGroup = p.bloodGroup;
      if (p.phone) user.phone = p.phone;
      if (p.guardianName) user.guardianName = p.guardianName;
      if (p.guardianPhone) user.guardianPhone = p.guardianPhone;
      if (p.address) user.address = p.address;
      if (p.bio) user.bio = p.bio;
      await user.save();
      console.log(`Updated profile for ${user.name} (${user.email}) -> Gender: ${p.gender}, Photo set.`);
    } else {
      console.warn(`User not found for email: ${p.email}`);
    }
  }

  console.log('\nAll student and staff profiles successfully updated with gender-tailored photos and details!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
