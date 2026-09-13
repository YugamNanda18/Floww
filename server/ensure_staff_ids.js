import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/ledgerx');
const col = mongoose.connection.db.collection('users');

let admin = await col.findOne({ role: 'admin' });
let superuser = await col.findOne({ role: 'superuser' });

console.log('Admin before:', admin?.employeeId, admin?.email);
console.log('Superuser before:', superuser?.employeeId, superuser?.email);

if (admin && !admin.employeeId) {
  await col.updateOne({ _id: admin._id }, { $set: { employeeId: 'ADM001' } });
}
if (superuser && !superuser.employeeId) {
  await col.updateOne({ _id: superuser._id }, { $set: { employeeId: 'SUP001' } });
}

admin = await col.findOne({ role: 'admin' });
superuser = await col.findOne({ role: 'superuser' });
console.log('Admin after:', admin?.employeeId, admin?.email);
console.log('Superuser after:', superuser?.employeeId, superuser?.email);

await mongoose.disconnect();
