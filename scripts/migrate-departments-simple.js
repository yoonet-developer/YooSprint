/**
 * Migration Script: Assign Departments to Existing Data
 *
 * This script updates all items (backlogs, tasks, sprints, users) that have
 * empty/null/missing department fields.
 *
 * Run with: node scripts/migrate-departments-simple.js
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function migrate() {
  try {
    console.log('🚀 Department Migration Script');
    console.log('='.repeat(80));
    console.log();

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables!');
      console.error('   Please check your .env.local file.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log();

    // Get direct access to collections
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const backlogsCollection = db.collection('backlogs');
    const tasksCollection = db.collection('tasks');
    const sprintsCollection = db.collection('sprints');

    // Count items without departments
    const emptyDeptFilter = {
      $or: [
        { department: '' },
        { department: null },
        { department: { $exists: false } }
      ]
    };

    console.log('📊 Analyzing data...');
    console.log('-'.repeat(80));

    const userCount = await usersCollection.countDocuments(emptyDeptFilter);
    const backlogCount = await backlogsCollection.countDocuments(emptyDeptFilter);
    const taskCount = await tasksCollection.countDocuments(emptyDeptFilter);
    const sprintCount = await sprintsCollection.countDocuments(emptyDeptFilter);

    const totalCount = userCount + backlogCount + taskCount + sprintCount;

    console.log(`Users without department: ${userCount}`);
    console.log(`Backlogs without department: ${backlogCount}`);
    console.log(`Tasks without department: ${taskCount}`);
    console.log(`Sprints without department: ${sprintCount}`);
    console.log();
    console.log(`📦 Total items to update: ${totalCount}`);
    console.log();

    if (totalCount === 0) {
      console.log('✅ No items found without departments. Migration not needed!');
      await mongoose.disconnect();
      rl.close();
      return;
    }

    // Show existing departments
    console.log('📋 Existing departments in the system:');
    console.log('-'.repeat(80));

    const existingDepts = await usersCollection.distinct('department');
    const validDepts = existingDepts.filter(d => d && d.trim() !== '');

    if (validDepts.length > 0) {
      validDepts.forEach((dept, index) => {
        console.log(`   ${index + 1}. ${dept}`);
      });
    } else {
      console.log('   (No departments found)');
    }
    console.log();

    // Ask for default department
    console.log('⚠️  WARNING: This will update ALL items without a department!');
    console.log();

    const departmentName = await question('Enter the department name to assign (e.g., "Marketplace"): ');

    if (!departmentName || departmentName.trim() === '') {
      console.log('❌ No department name provided. Migration cancelled.');
      await mongoose.disconnect();
      rl.close();
      return;
    }

    const trimmedDept = departmentName.trim();
    console.log();
    console.log('📝 Migration Plan:');
    console.log('-'.repeat(80));
    console.log(`Will update ${totalCount} items to department: "${trimmedDept}"`);
    console.log(`   - ${userCount} users`);
    console.log(`   - ${backlogCount} backlogs`);
    console.log(`   - ${taskCount} tasks`);
    console.log(`   - ${sprintCount} sprints`);
    console.log();

    const confirm = await question('Do you want to proceed? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Migration cancelled by user.');
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log();
    console.log('🔄 Starting migration...');
    console.log('-'.repeat(80));

    // Perform updates
    let successCount = 0;
    let errorCount = 0;

    // Update Users
    if (userCount > 0) {
      try {
        const userResult = await usersCollection.updateMany(
          emptyDeptFilter,
          { $set: { department: trimmedDept } }
        );
        console.log(`✅ Updated ${userResult.modifiedCount} users`);
        successCount += userResult.modifiedCount;
      } catch (error) {
        console.error(`❌ Error updating users: ${error.message}`);
        errorCount += userCount;
      }
    }

    // Update Backlogs
    if (backlogCount > 0) {
      try {
        const backlogResult = await backlogsCollection.updateMany(
          emptyDeptFilter,
          { $set: { department: trimmedDept } }
        );
        console.log(`✅ Updated ${backlogResult.modifiedCount} backlogs`);
        successCount += backlogResult.modifiedCount;
      } catch (error) {
        console.error(`❌ Error updating backlogs: ${error.message}`);
        errorCount += backlogCount;
      }
    }

    // Update Tasks
    if (taskCount > 0) {
      try {
        const taskResult = await tasksCollection.updateMany(
          emptyDeptFilter,
          { $set: { department: trimmedDept } }
        );
        console.log(`✅ Updated ${taskResult.modifiedCount} tasks`);
        successCount += taskResult.modifiedCount;
      } catch (error) {
        console.error(`❌ Error updating tasks: ${error.message}`);
        errorCount += taskCount;
      }
    }

    // Update Sprints
    if (sprintCount > 0) {
      try {
        const sprintResult = await sprintsCollection.updateMany(
          emptyDeptFilter,
          { $set: { department: trimmedDept } }
        );
        console.log(`✅ Updated ${sprintResult.modifiedCount} sprints`);
        successCount += sprintResult.modifiedCount;
      } catch (error) {
        console.error(`❌ Error updating sprints: ${error.message}`);
        errorCount += sprintCount;
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✨ Migration Complete!');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${successCount} items`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update: ${errorCount} items`);
    }
    console.log();

    // Verify migration
    console.log('🔍 Verifying migration...');
    const remainingUsers = await usersCollection.countDocuments(emptyDeptFilter);
    const remainingBacklogs = await backlogsCollection.countDocuments(emptyDeptFilter);
    const remainingTasks = await tasksCollection.countDocuments(emptyDeptFilter);
    const remainingSprints = await sprintsCollection.countDocuments(emptyDeptFilter);
    const remainingTotal = remainingUsers + remainingBacklogs + remainingTasks + remainingSprints;

    if (remainingTotal === 0) {
      console.log('✅ All items now have departments assigned!');
    } else {
      console.log(`⚠️  ${remainingTotal} items still without departments:`);
      console.log(`   Users: ${remainingUsers}`);
      console.log(`   Backlogs: ${remainingBacklogs}`);
      console.log(`   Tasks: ${remainingTasks}`);
      console.log(`   Sprints: ${remainingSprints}`);
    }

    console.log();
    console.log('🎉 You can now login as department admin and see the data!');
    console.log();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    rl.close();
  }
}

// Run migration
migrate();
