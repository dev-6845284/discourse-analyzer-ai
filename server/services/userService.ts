import User, { IUser } from '../models/User';

export const getAllUsers = async () => {
  return User.find({}, '-password').sort({ createdAt: -1 });
};

export const createUser = async (userData: Partial<IUser>) => {
  const user = new User(userData);
  await user.save();
  const userObj = user.toObject();
  const { password, ...userWithoutPassword } = userObj;
  return userWithoutPassword;
};

export const updateUser = async (id: string, userData: Partial<IUser>) => {
  // Prevent password update through this method
  delete userData.password;
  
  const user = await User.findByIdAndUpdate(id, userData, { new: true }).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const deleteUser = async (id: string) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const changePassword = async (id: string, newPassword: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  user.password = newPassword;
  await user.save();
  return { message: 'Password updated successfully' };
};

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email });
};
